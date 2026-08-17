/**
 * horizontal 风格控制栏。
 *
 * 旧版 horizontal 与十周年控制栏只有布局差异，因此复用新版十周年行为，
 * 将个人调整保留在 ui/styles/lbtn/horizontal.css 中。
 */
import { createShizhounianLbtnPlugin } from "./shizhounian.js";
import { inheritSkin } from "../../skins/skinFactory.js";

export const createHorizontalLbtnPlugin = inheritSkin(createShizhounianLbtnPlugin, "horizontal");
