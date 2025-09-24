import { cancelAllTasks } from "../utils/Logger";
import { chatPanels } from "./chatPanels";

export function closeAllPanels() {
  chatPanels.forEach((panelInfo) => {
    cancelAllTasks(panelInfo.activeTasks);
    panelInfo.pendingFormRequests.forEach(({ reject }) =>
      reject(
        new Error(
          "Form request cancelled: Webview panel closed during deactivation."
        )
      )
    );
    panelInfo.pendingFormRequests.clear();
  });
}
