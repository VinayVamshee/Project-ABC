import React from "react";
import "./Settings.css";

export default function Settings() {
    return (
        <div className="settings-page">
            <h2 className="page-title">Settings</h2>
            <div className="card mt-4">
                <div className="card-body p-5 text-center">
                    <h4 className="text-muted">Dynamic Field Settings Have Been Removed</h4>
                    <p className="mt-3">
                        The application has been successfully migrated to an explicit domain architecture.
                        You no longer need to manually create and map fields. All business properties 
                        are now natively supported and strongly typed in the backend.
                    </p>
                </div>
            </div>
        </div>
    );
}