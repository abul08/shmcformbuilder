
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Loading Dashboard...</p>
            </div>
        </div>
    );
}
