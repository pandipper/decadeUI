/**
 * dyon 没有独立的武将详情逻辑，沿用新版十周年实现。
 */
import { createShizhounianCharacterPlugin } from "./shizhounian.js";
import { inheritSkin } from "../../skins/skinFactory.js";

export const createDyonCharacterPlugin = inheritSkin(createShizhounianCharacterPlugin, "dyon");
