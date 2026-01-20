import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as zlib from "zlib";

/**
 * Splits a large JSONL file into smaller chunks
 * Usage: tsx script/split-jsonl.ts <input_file> <lines_per_chunk>
 */
async function splitJSONL(inputPath: string, linesPerChunk: number = 50000) {
  const inputDir = path.dirname(inputPath);
  // Remove .gz extension if present, then remove .jsonl to get base name
  let baseName = path.basename(inputPath, path.extname(inputPath));
  if (baseName.endsWith('.jsonl')) {
    baseName = baseName.slice(0, -6); // Remove .jsonl
  }
  const isGzipped = inputPath.endsWith('.gz');
  
  console.log(`Splitting ${inputPath} into chunks of ${linesPerChunk} lines each...`);
  
  const fileStream = fs.createReadStream(inputPath);
  const inputStream = isGzipped 
    ? fileStream.pipe(zlib.createGunzip())
    : fileStream;
  
  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  let currentChunk = 1;
  let currentLineCount = 0;
  let currentOutput: fs.WriteStream | null = null;
  let totalLines = 0;

  const openNewChunk = (chunkNum: number): fs.WriteStream => {
    const chunkPath = path.join(inputDir, `${baseName}_part${chunkNum}.jsonl`);
    const output = fs.createWriteStream(chunkPath);
    return output;
  };

  const closeChunk = async (output: fs.WriteStream, chunkNum: number, lineCount: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      output.end(() => {
        const chunkPath = path.join(inputDir, `${baseName}_part${chunkNum}.jsonl`);
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
    console.log(`   Files created in: ${inputDir}`);
    console.log(`\n   You can now upload these files to Replit:`);
    for (let i = 1; i <= currentChunk; i++) {
      console.log(`   - ${baseName}_part${i}.jsonl`);
    }
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
  console.error("Usage: tsx script/split-jsonl.ts <input_file> [lines_per_chunk]");
  console.error("Example: tsx script/split-jsonl.ts attached_assets/tesis.jsonl.gz 50000");
  process.exit(1);
}

const inputFile = args[0];
const linesPerChunk = args[1] ? parseInt(args[1], 10) : 50000;

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

splitJSONL(inputFile, linesPerChunk).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
