import React from "react";
import { AuditLogTable } from "./components/AuditLogTable";

export default function AuditPage() {
    return (
        <div className="flex flex-col h-full space-y-6 pt-2 pb-8 px-6">
            <div className="flex-1 min-h-0">
                <AuditLogTable />
            </div>
        </div>
    );
}
