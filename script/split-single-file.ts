import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

/**
 * Splits a single JSONL file into smaller chunks
 * Usage: tsx script/split-single-file.ts <input_file> <lines_per_chunk>
 */
async function splitSingleFile(inputPath: string, linesPerChunk: number = 5000) {
  const inputDir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  
  console.log(`Splitting ${inputPath} into chunks of ${linesPerChunk} lines each...`);
  
  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentChunk = 1;
  let currentLineCount = 0;
  let currentOutput: fs.WriteStream | null = null;
  let totalLines = 0;

  const openNewChunk = (chunkNum: number): fs.WriteStream => {
    const chunkPath = path.join(inputDir, `${baseName}_chunk${chunkNum}.jsonl`);
    const output = fs.createWriteStream(chunkPath);
    return output;
  };

  const closeChunk = async (output: fs.WriteStream, chunkNum: number, lineCount: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      output.end(() => {
        const chunkPath = path.join(inputDir, `${baseName}_chunk${chunkNum}.jsonl`);
        const stats = fs.statSync(chunkPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  Created ${path.basename(chunkPath)}: ${lineCount} lines, ${sizeMB} MB`);
        resolve();
      });
      output.on('error', reject);
    });
  };

  // Open first chunk
  currentOutput = openNewChunk(currentChunk);

  rl.on("line", (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    totalLines++;
    currentLineCount++;

    // Write line immediately to current chunk
    if (currentOutput) {
      currentOutput.write(trimmedLine + '\n');
    }

    // Check if we need to start a new chunk
    if (currentLineCount >= linesPerChunk) {
      // Close current chunk and start new one
      if (currentOutput) {
        currentOutput.end();
      }
      currentChunk++;
      currentLineCount = 0;
      currentOutput = openNewChunk(currentChunk);
    }
  });

  rl.on("close", async () => {
    // Close last chunk
    if (currentOutput) {
      await closeChunk(currentOutput, currentChunk, currentLineCount);
    }
    
    console.log(`\n✅ Split complete!`);
    console.log(`   Total lines: ${totalLines}`);
    console.log(`   Total chunks: ${currentChunk}`);
    console.log(`   Original file can now be deleted: ${path.basename(inputPath)}`);
  });

  rl.on("error", (error) => {
    console.error("Error reading file:", error);
    if (currentOutput) {
      currentOutput.destroy();
    }
    process.exit(1);
  });
}

// Get arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx script/split-single-file.ts <input_file> [lines_per_chunk]");
  console.error("Example: tsx script/split-single-file.ts attached_assets/tesis_part2.jsonl 5000");
  process.exit(1);
}

const inputFile = args[0];
const linesPerChunk = args[1] ? parseInt(args[1], 10) : 5000;

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

splitSingleFile(inputFile, linesPerChunk).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
