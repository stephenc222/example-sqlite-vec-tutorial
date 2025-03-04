import BetterSqlite3 from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { createResumeEmbedding, createJobEmbedding } from "./embed";

const DB_PATH = "./db.sqlite";
let db: BetterSqlite3.Database;

// Serialize & Deserialize Float32Array for SQLite
export function serializeEmbedding(embedding: number[] | Float32Array): Buffer {
  const buffer = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

export function deserializeEmbedding(buffer: Buffer): Float32Array {
  const result = new Float32Array(buffer.length / 4);
  for (let i = 0; i < result.length; i++) {
    result[i] = buffer.readFloatLE(i * 4);
  }
  return result;
}

// Setup SQLite-Vec Database
export async function setupDatabase(): Promise<BetterSqlite3.Database> {
  try {
    db = new BetterSqlite3(DB_PATH);
    sqliteVec.load(db);

    // if this database already exists, clear it for this example
    db.exec("DROP TABLE IF EXISTS resumes");
    db.exec("DROP TABLE IF EXISTS jobs");
    db.exec("DROP TABLE IF EXISTS vss_resumes");
    db.exec("DROP TABLE IF EXISTS vss_jobs");

    db.exec(`
      -- Create resumes table
      CREATE TABLE IF NOT EXISTS resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_name TEXT NOT NULL,
        seniority TEXT,
        skills TEXT,
        industry TEXT,
        resume_text TEXT NOT NULL,
        embedding TEXT -- Store as JSON string
      );

      -- Create job postings table
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_title TEXT NOT NULL,
        seniority TEXT,
        required_skills TEXT,
        industry TEXT,
        job_description TEXT NOT NULL,
        embedding TEXT -- Store as JSON string
      );

      -- Create vector search tables
      CREATE VIRTUAL TABLE IF NOT EXISTS vss_resumes USING vec0(
        embedding float[768]
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS vss_jobs USING vec0(
        embedding float[768]
      );
    `);

    const result = db.prepare("SELECT vec_version() AS vec_version").get() as { vec_version: string };
    console.log(`sqlite-vec version: ${result.vec_version}`);
    return db;
  } catch (error) {
    console.error("Failed to setup database:", error);
    throw error;
  }
}

/**
 * 🔹 Functions for Managing Resumes
 */

// Clear all resume embeddings
export function clearResumeEmbeddings(): void {
  db.prepare("DELETE FROM resumes").run();
  db.prepare("DELETE FROM vss_resumes").run();
  console.log("Cleared all resume embeddings");
}

// Create or update a resume embedding
export async function createOrUpdateResumeEmbedding(
  candidate_name: string,
  resume_text: string,
  seniority: string,
  skills: string[],
  industry: string
): Promise<void> {
  
  const existingResume = db.prepare(
    "SELECT id FROM resumes WHERE candidate_name = ?"
  ).get(candidate_name) as { id: number } | undefined;

  const formattedResumeText = `
  Candidate Profile: ${candidate_name}
  Experience Level: ${seniority}
  Core Skills: ${skills.join(", ")}
  Industry Experience: ${industry}

  Summary:
  This candidate is a ${seniority} professional specializing in ${skills.join(", ")}.
  They have a strong background in ${industry}, with expertise in ${skills.join(", ")}.

  ✅ Key Qualifications:
  - ${skills.slice(0, 3).join("\n  - ")}
  - Experience working in ${industry} industry environments.
  
  🎯 Ideal Job Fit:
  Positions requiring ${skills.slice(0, 3).join(" or ")}, with a focus on ${industry}.

  Resume Content:
  ${resume_text}
`;
  
  const embedding = await createResumeEmbedding(formattedResumeText);

  if (existingResume) {
    // Update existing resume
    db.prepare(`
      UPDATE resumes 
      SET embedding = ?, seniority = ?, skills = ?, industry = ?, resume_text = ?
      WHERE candidate_name = ?
    `).run(embedding, seniority, skills.join(", "), industry, resume_text, candidate_name);

    // Ensure rowid is an integer when inserting into vss_resumes
    db.prepare("DELETE FROM vss_resumes WHERE rowid = ?").run(existingResume.id);
    db.prepare("INSERT INTO vss_resumes (rowid, embedding) VALUES (CAST(? AS INTEGER), ?)").run(existingResume.id, embedding);

    console.log(`Updated resume for candidate: ${candidate_name}`);
  } else {
    // Insert new resume
    const info = db.prepare(`
      INSERT INTO resumes (candidate_name, seniority, skills, industry, resume_text, embedding)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(candidate_name, seniority, skills.join(", "), industry, resume_text, embedding);

    const rowid = Number(info.lastInsertRowid); // Ensure it is an integer

    db.prepare("INSERT INTO vss_resumes (rowid, embedding) VALUES (CAST(? AS INTEGER), ?)").run(rowid, embedding);

    console.log(`Added new resume: ${candidate_name}`);
  }
}

/**
 * 🔹 Functions for Managing Job Postings
 */

// Clear all job embeddings
export function clearJobEmbeddings(): void {
  db.prepare("DELETE FROM jobs").run();
  db.prepare("DELETE FROM vss_jobs").run();
  console.log("Cleared all job embeddings");
}

// Create or update a job embedding
export async function createOrUpdateJobEmbedding(
  job_title: string,
  job_description: string,
  seniority: string,
  required_skills: string[],
  industry: string
): Promise<void> {
  // Create a comprehensive job context with rich semantic information
  const primarySkills = required_skills.slice(0, 3);
  
  const existingJob = db.prepare(
    "SELECT id FROM jobs WHERE job_title = ?"
  ).get(job_title) as { id: number } | undefined;

  // Create an enriched job description with clear sections and enhanced semantic structure
  const formattedJobDescription = `
  JOB LISTING - ${job_title}
  Experience Level: ${seniority}
  Industry: ${industry}

  Role Overview:
  This role is ideal for a ${seniority} candidate with experience in ${primarySkills.join(", ")}.
  The ideal candidate should have a strong background in ${industry}.

  ✅ Required Expertise:
  - ${primarySkills.join("\n  - ")}
  - Background in ${industry} projects.

  🎯 Best-Fit Candidates:
  Professionals experienced in ${required_skills.join(", ")}, ideally within ${industry}.

  Job Responsibilities:
  - Utilize ${primarySkills.join(", ")} for day-to-day tasks.
  - Work closely with cross-functional teams in the ${industry} space.

  KEYWORDS: ${job_title}, ${industry}, ${required_skills.join(", ")}, ${seniority}
`;
  
  const embedding = await createJobEmbedding(job_title, formattedJobDescription);

  if (existingJob) {
    // Update existing job
    db.prepare(`
      UPDATE jobs 
      SET embedding = ?, seniority = ?, required_skills = ?, industry = ?, job_description = ?
      WHERE job_title = ?
    `).run(embedding, seniority, required_skills.join(", "), industry, job_description, job_title);

    db.prepare("DELETE FROM vss_jobs WHERE rowid = ?").run(existingJob.id);
    db.prepare("INSERT INTO vss_jobs (rowid, embedding) VALUES (CAST(? AS INTEGER), ?)").run(existingJob.id, embedding);

    console.log(`Updated job listing: ${job_title}`);
  } else {
    // Insert new job
    const info = db.prepare(`
      INSERT INTO jobs (job_title, seniority, required_skills, industry, job_description, embedding)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(job_title, seniority, required_skills.join(", "), industry, job_description, embedding);

    const rowid = Number(info.lastInsertRowid); // Ensure it is an integer

    db.prepare("INSERT INTO vss_jobs (rowid, embedding) VALUES (CAST(? AS INTEGER), ?)").run(rowid, embedding);

    console.log(`Added new job listing: ${job_title}`);
  }
}

/**
 * 🔹 AI-Powered Job Matching with SQLite-Vec
 */

// Find the best-matching resumes for a job
export async function findMatchingResumes(
  job_title: string,
  limit: number = 3
): Promise<{ title: string; similarity: number }[]> {
  const job = db.prepare(
    "SELECT id, embedding FROM jobs WHERE job_title = ?"
  ).get(job_title) as { id: number; embedding: string } | undefined;

  if (!job) return [];

  const similarResumes = db.prepare(`
    SELECT rowid, distance FROM vss_resumes WHERE embedding MATCH ? ORDER BY distance LIMIT ?
  `).all(job.embedding, limit) as { rowid: number; distance: number }[];

  return similarResumes.map(({ rowid, distance }) => {
    const resume = db.prepare("SELECT candidate_name FROM resumes WHERE id = ?").get(rowid) as { candidate_name: string };
    return { title: resume.candidate_name, similarity: 1 - distance }; // Convert distance to similarity
  });
}

export async function findMatchingJobs(
  candidate_name: string,
  limit: number = 3
): Promise<{ title: string; similarity: number }[]> {
  const resume = db.prepare(
    "SELECT id, skills, embedding FROM resumes WHERE candidate_name = ?"
  ).get(candidate_name) as { id: number; skills: string; embedding: string } | undefined;

  if (!resume) return [];

  const similarJobs = db.prepare(`
    SELECT rowid, distance FROM vss_jobs WHERE embedding MATCH ? ORDER BY distance LIMIT ?
  `).all(resume.embedding, limit) as { rowid: number; distance: number }[];

  let jobMatches = similarJobs.map(({ rowid, distance }) => {
    const job = db.prepare("SELECT job_title, required_skills FROM jobs WHERE id = ?")
      .get(rowid) as { job_title: string; required_skills: string };

    const baseSimilarity = Math.max(0, Math.min(1, 1 - distance)); // Clamp between 0-1
    const skillOverlap = resume.skills.split(", ").filter(skill => job.required_skills.includes(skill)).length;

    return {
      title: job.job_title,
      similarity: Math.min(1, baseSimilarity + (skillOverlap * 0.05)) // Ensure it never exceeds 1
    };
  });

  return jobMatches.sort((a, b) => b.similarity - a.similarity); // Sort by highest similarity
}
