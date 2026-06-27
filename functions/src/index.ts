/**
 * Cloud Functions entry point.
 * firebase-admin is initialized once here; all other modules import from
 * firebase-admin/* sub-packages which share this initialization.
 */

import { initializeApp } from "firebase-admin/app";

initializeApp();

export { processUpload }   from "./uploads/processUpload.js";
export { deleteItem }      from "./uploads/deleteItem.js";
export { changeUsername }  from "./uploads/changeUsername.js";
export { getVideoUrl }     from "./uploads/getVideoUrl.js";
