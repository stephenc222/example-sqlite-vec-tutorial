import { pipeline } from "@xenova/transformers";

// Define the embedding pipeline for this non-production example
let embedder: any;

async function createEmbedding(input: string) {
  if (!embedder) {
    throw new Error("Embedding model is not initialized. Call setupEmbeddings first.");
  }
  
  // Generate the embedding
  const result = await embedder(input, { pooling: "mean", normalize: true });

  return result.data;
}

export async function createQueryEmbedding(query: string) {
  return createEmbedding(query);
}

export async function setupEmbeddings() {
  try {
    console.log("Loading GTE-base embedding model...");
    
    // Load the sentence-transformer model
    embedder = await pipeline("feature-extraction", "Xenova/gte-base");
    
    console.log("Embedding model loaded successfully");
  } catch (err) {
    console.error("Failed to load the embedding model", err);
  }
}

export async function createJobEmbedding(job_title: string, job_description: string) {
  const embedding = await createEmbedding(job_title + " " + job_description);
  return embedding;
}


export async function createResumeEmbedding(resume_text: string) {
  const embedding = await createEmbedding(resume_text);
  return embedding;
}


