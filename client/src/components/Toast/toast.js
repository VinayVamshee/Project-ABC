let notifyHandler = null;

export const registerNotify = (fn) => {
  notifyHandler = fn;
};

export const notify = {
  success: (message) => notifyHandler?.("success", message),
  error: (message) => notifyHandler?.("error", message),
  info: (message) => notifyHandler?.("info", message),
};