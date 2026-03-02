import "dotenv/config";
import { saveCapitalGainsData } from "./src/app/actions/capital-gains";
import { readFileSync } from "fs";

async function run() {
    const fileBuf = readFileSync("ALXXXXXX9J_CY_01042025-01032026_IP205799300_01032026043051125.xls");

    const mockFormData = {
        get: (key: string) => {
            if (key === "file") {
                return {
                    arrayBuffer: async () => fileBuf
                }
            }
            return null;
        }
    };

    try {
        console.log("Attempting to save...");
        const res = await saveCapitalGainsData(mockFormData as any, true);
        console.log("Success:", res);
    } catch (e) {
        console.error("Save Error:", e);
    }
}

run();
