const fs = require("node:fs/promises");
const path = require("node:path");

const REMOTE_BASE_URL =
  "https://ten-framework-assets.s3.amazonaws.com/live2d-models/marmot";
const LOCAL_MODEL_DIR = path.join(__dirname, "..", "public", "models", "marmot");
const MODEL_FILE = "L065.model3.json";

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function collectLive2DModelFiles(model) {
  const refs = model.FileReferences || {};
  const files = [MODEL_FILE, refs.Moc, refs.Physics, refs.Pose, refs.DisplayInfo];

  if (Array.isArray(refs.Textures)) {
    files.push(...refs.Textures);
  }

  if (Array.isArray(refs.Expressions)) {
    refs.Expressions.forEach((expression) => files.push(expression.File));
  }

  if (refs.Motions && typeof refs.Motions === "object") {
    Object.values(refs.Motions).forEach((motionGroup) => {
      if (Array.isArray(motionGroup)) {
        motionGroup.forEach((motion) => files.push(motion.File));
      }
    });
  }

  return uniqueSorted(files);
}

async function downloadFile(filePath, { baseUrl = REMOTE_BASE_URL, outputDir = LOCAL_MODEL_DIR } = {}) {
  const url = `${baseUrl}/${filePath.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const targetPath = path.join(outputDir, ...filePath.split("/"));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const body = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(targetPath, body);
  return targetPath;
}

async function downloadKevinModel(options = {}) {
  const baseUrl = options.baseUrl || REMOTE_BASE_URL;
  const outputDir = options.outputDir || LOCAL_MODEL_DIR;
  await fs.mkdir(outputDir, { recursive: true });

  const modelUrl = `${baseUrl}/${MODEL_FILE}`;
  const modelResponse = await fetch(modelUrl);
  if (!modelResponse.ok) {
    throw new Error(
      `Failed to download ${modelUrl}: ${modelResponse.status} ${modelResponse.statusText}`
    );
  }

  const model = await modelResponse.json();
  const modelPath = path.join(outputDir, MODEL_FILE);
  await fs.writeFile(modelPath, `${JSON.stringify(model, null, 2)}\n`, "utf8");

  const files = collectLive2DModelFiles(model).filter((filePath) => filePath !== MODEL_FILE);
  for (const filePath of files) {
    const targetPath = await downloadFile(filePath, { baseUrl, outputDir });
    console.log(`Downloaded ${filePath} -> ${targetPath}`);
  }

  console.log(`Kevin model ready at ${outputDir}`);
  return { outputDir, files: [MODEL_FILE, ...files] };
}

if (require.main === module) {
  downloadKevinModel().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  collectLive2DModelFiles,
  downloadKevinModel,
};
