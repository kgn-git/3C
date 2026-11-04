import type { DashboardMetrics } from "./metrics.js";
import { type DeliveryMetrics } from "./delivery.js";
import type { DeliveryDescription } from "./delivery-status.js";
import type { DeveloperView } from "./views/developer.js";
import type { ManagerView } from "./views/manager.js";
export declare function renderDashboardHtml(delivery: DeliveryMetrics | null, gates: DashboardMetrics | null, windowLabel: string, source?: DeliveryDescription | null, developer?: DeveloperView | null, manager?: ManagerView | null): string;
//# sourceMappingURL=render.d.ts.map