import fs from "fs";
import path from "path";

const filesDir = path.join(process.cwd(), "node_modules", "@fontsource", "roboto", "files");
console.log("Files in @fontsource/roboto/files:", fs.readdirSync(filesDir).filter(f => f.includes("400") || f.includes("700")));
