/**
 * horizontal 风格技能栏。
 *
 * 旧版 main_horizontal.js 与 main2.js 完全一致，所以直接继承新版十周年技能逻辑。
 */
import { createShizhounianSkillPlugin } from "./shizhounian.js";
import { inheritSkin } from "../../skins/skinFactory.js";

export const createHorizontalSkillPlugin = inheritSkin(createShizhounianSkillPlugin, "horizontal");
