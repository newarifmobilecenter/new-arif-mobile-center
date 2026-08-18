import { infinixTools } from "./infinix";
import { vivoTools } from "./vivo";
import { oppoTools } from "./oppo";
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