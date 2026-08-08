import { infinixTools } from "./Infinix";
import { vivoTools } from "./Vivo";
import { oppoTools } from "./Oppo";
import { samsungTools } from "./Samsung";

export const tools = [
  ...infinixTools.map((item) => ({
    ...item,
    category: "Infinix / Tecno / Itel",
  })),

  ...vivoTools.map((item) => ({
    ...item,
    category: "Vivo / iQOO",
  })),

  ...oppoTools.map((item) => ({
    ...item,
    category: "Oppo / Realme / OnePlus",
  })),

  ...samsungTools.map((item) => ({
    ...item,
    category: "Samsung",
  })),
];