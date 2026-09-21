//---------------------------------------------------------------------
// QRCode for JavaScript (compact, zero-dependency)
// Based on Kazuhiko Arase's QR Code specification implementation (MIT)
// Supports text, IDs, URLs with automatic version & error correction
//---------------------------------------------------------------------

function QRPolynomial(num, shift) {
  if (num.length === undefined) throw new Error(num.length + "/" + shift);
  let offset = 0;
  while (offset < num.length && num[offset] === 0) offset++;
  this.num = new Array(num.length - offset + shift);
  for (let i = 0; i < num.length - offset; i++) this.num[i] = num[offset + i];
  for (let i = 0; i < shift; i++) this.num[num.length - offset + i] = 0;
}
QRPolynomial.prototype = {
  get: function (i) { return this.num[i]; },
  getLength: function () { return this.num.length; },
  multiply: function (e) {
    const num = new Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gmult(this.get(i), e.get(j));
      }
    }
    return new QRPolynomial(num, 0);
  },
  mod: function (e) {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gmult(e.get(i), QRMath.gexp(ratio));
    }
    return new QRPolynomial(num, 0).mod(e);
  },
};

const QRMath = {
  glog: function (n) {
    if (n < 1) throw new Error("glog(" + n + ")");
    return QRMath.LOG_TABLE[n];
  },
  gexp: function (n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return QRMath.EXP_TABLE[n];
  },
  gmult: function (a, b) {
    if (a === 0 || b === 0) return 0;
    return QRMath.gexp(QRMath.glog(a) + QRMath.glog(b));
  },
  EXP_TABLE: new Array(256),
  LOG_TABLE: new Array(256),
};
for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
  QRMath.EXP_TABLE[i] =
    QRMath.EXP_TABLE[i - 4] ^
    QRMath.EXP_TABLE[i - 5] ^
    QRMath.EXP_TABLE[i - 6] ^
    QRMath.EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

const QRMaskPattern = {
  PATTERN000: 0, PATTERN001: 1, PATTERN010: 2, PATTERN011: 3,
  PATTERN100: 4, PATTERN101: 5, PATTERN110: 6, PATTERN111: 7,
};

const QRUtil = {
  PATTERN_POSITION_TABLE: [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
    [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
    [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
    [6, 34, 62, 90],
  ],
  G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
  G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
  G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
  getBCHTypeInfo: function (data) {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15));
    }
    return ((data << 10) | d) ^ QRUtil.G15_MASK;
  },
  getBCHTypeNumber: function (data) {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18));
    }
    return (data << 12) | d;
  },
  getBCHDigit: function (data) {
    let digit = 0;
    while (data !== 0) { digit++; data >>>= 1; }
    return digit;
  },
  getPatternPosition: function (typeNumber) {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
  },
  getMask: function (maskPattern, i, j) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000: return (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001: return i % 2 === 0;
      case QRMaskPattern.PATTERN010: return j % 3 === 0;
      case QRMaskPattern.PATTERN011: return (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101: return ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111: return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default: throw new Error("bad maskPattern:" + maskPattern);
    }
  },
  getErrorCorrectPolynomial: function (errorCorrectLength) {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  },
  getLengthInBits: function (mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case 1: return 10;
        case 2: return 9;
        case 4: return 8;
        case 8: return 8;
        default: throw new Error("mode:" + mode);
      }
    } else if (type < 27) {
      switch (mode) {
        case 1: return 12;
        case 2: return 11;
        case 4: return 16;
        case 8: return 10;
        default: throw new Error("mode:" + mode);
      }
    } else {
      switch (mode) {
        case 1: return 14;
        case 2: return 13;
        case 4: return 16;
        case 8: return 12;
        default: throw new Error("mode:" + mode);
      }
    }
  },
  getLostPoint: function (qrCode) {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (
          qrCode.isDark(row, col) &&
          !qrCode.isDark(row, col + 1) &&
          qrCode.isDark(row, col + 2) &&
          qrCode.isDark(row, col + 3) &&
          qrCode.isDark(row, col + 4) &&
          !qrCode.isDark(row, col + 5) &&
          qrCode.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (
          qrCode.isDark(row, col) &&
          !qrCode.isDark(row + 1, col) &&
          qrCode.isDark(row + 2, col) &&
          qrCode.isDark(row + 3, col) &&
          qrCode.isDark(row + 4, col) &&
          !qrCode.isDark(row + 5, col) &&
          qrCode.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) darkCount++;
      }
    }
    const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  },
};

// RS Block Table (EC Level M: index 0)
const RS_BLOCK_TABLE = [
  [1, 26, 16], [1, 44, 28], [1, 70, 44], [2, 50, 32],
  [2, 67, 43], [4, 43, 27], [2, 78, 43], [2, 97, 49],
  [2, 116, 60], [4, 68, 38], [2, 119, 58], [4, 99, 45],
  [4, 107, 46], [4, 115, 42], [6, 87, 33], [8, 75, 26],
  [8, 75, 25], [10, 69, 21], [8, 99, 33], [10, 89, 26],
];

function QRBitBuffer() {
  this.buffer = [];
  this.length = 0;
}
QRBitBuffer.prototype = {
  get: function (index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  },
  put: function (num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  },
  getLengthInBits: function () { return this.length; },
  putBit: function (bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    this.length++;
  },
};

function QRCodeModel(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = [];
}
QRCodeModel.prototype = {
  addData: function (data) {
    this.dataList.push(data);
    this.dataCache = null;
  },
  isDark: function (row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return this.modules[row][col];
  },
  getModuleCount: function () { return this.moduleCount; },
  make: function () {
    if (this.typeNumber < 1) {
      let typeNumber = 1;
      for (typeNumber = 1; typeNumber < 20; typeNumber++) {
        const rsBlocks = RS_BLOCK_TABLE[typeNumber - 1];
        let totalDataCount = 0;
        if (rsBlocks) totalDataCount = rsBlocks[0] * rsBlocks[2];
        const buffer = new QRBitBuffer();
        for (let i = 0; i < this.dataList.length; i++) {
          const d = this.dataList[i];
          buffer.put(4, 4); // 8-bit byte mode
          buffer.put(d.length, QRUtil.getLengthInBits(4, typeNumber));
          for (let j = 0; j < d.length; j++) buffer.put(d.charCodeAt(j), 8);
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) break;
      }
      this.typeNumber = Math.min(typeNumber, 20);
    }
    this.makeImpl(false, this.getBestMaskPattern());
  },
  makeImpl: function (test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (let col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) this.setupTypeNumber(test);
    if (this.dataCache === null) {
      this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }
    this.mapData(this.dataCache, maskPattern);
  },
  setupPositionProbePattern: function (row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  },
  getBestMaskPattern: function () {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  },
  setupTimingPattern: function () {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  },
  setupPositionAdjustPattern: function () {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  },
  setupTypeNumber: function (test) {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  },
  setupTypeInfo: function (test, maskPattern) {
    const data = (0 << 3) | maskPattern; // EC level M = 0
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.moduleCount - 15 + i][8] = mod;
    }
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8][8] = !test;
  },
  mapData: function (data, maskPattern) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = QRUtil.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  },
};

QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
  const rsBlocks = RS_BLOCK_TABLE[typeNumber - 1];
  const buffer = new QRBitBuffer();
  for (let i = 0; i < dataList.length; i++) {
    const d = dataList[i];
    buffer.put(4, 4);
    buffer.put(d.length, QRUtil.getLengthInBits(4, typeNumber));
    for (let j = 0; j < d.length; j++) buffer.put(d.charCodeAt(j), 8);
  }
  const totalDataCount = rsBlocks[0] * rsBlocks[2];
  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
  }
  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
  while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
  while (true) {
    if (buffer.getLengthInBits() >= totalDataCount * 8) break;
    buffer.put(0xec, 8);
    if (buffer.getLengthInBits() >= totalDataCount * 8) break;
    buffer.put(0x11, 8);
  }
  return QRCodeModel.createBytes(buffer, rsBlocks);
};

QRCodeModel.createBytes = function (buffer, rsBlocks) {
  let offset = 0;
  let maxDcCount = 0;
  let maxEcCount = 0;
  const dcdata = new Array(rsBlocks[0]);
  const ecdata = new Array(rsBlocks[0]);
  const count = rsBlocks[0];
  const totalCount = rsBlocks[1];
  const dataCount = rsBlocks[2];

  for (let r = 0; r < count; r++) {
    const dcCount = dataCount;
    const ecCount = totalCount - dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);
    dcdata[r] = new Array(dcCount);
    for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
    offset += dcCount;
    const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
    const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
    const modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.getLength() - 1);
    for (let i = 0; i < ecdata[r].length; i++) {
      const modIndex = i + modPoly.getLength() - ecdata[r].length;
      ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
  }

  let totalCodeCount = 0;
  for (let i = 0; i < rsBlocks[0]; i++) totalCodeCount += rsBlocks[1];
  const data = new Array(totalCodeCount);
  let index = 0;
  for (let i = 0; i < maxDcCount; i++) {
    for (let r = 0; r < count; r++) {
      if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    }
  }
  for (let i = 0; i < maxEcCount; i++) {
    for (let r = 0; r < count; r++) {
      if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    }
  }
  return data;
};

// Generates 2D boolean matrix [row][col] = isDark
export function generateQRMatrix(text) {
  if (!text) return [];
  const qr = new QRCodeModel(0, 0); // auto type, EC level M
  qr.addData(String(text));
  qr.make();
  const count = qr.getModuleCount();
  const matrix = [];
  for (let r = 0; r < count; r++) {
    const row = [];
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
    matrix.push(row);
  }
  return matrix;
}
