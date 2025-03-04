import { 
  setupDatabase, 
  createOrUpdateResumeEmbedding,
  createOrUpdateJobEmbedding,
  findMatchingResumes,
  findMatchingJobs
} from "./db"

import { setupEmbeddings } from "./embed"

async function jobMatchingDemo() {
  console.log("\n=== AI-Powered Resume & Job Matching with SQLite-Vec ===");

  console.log("\n🔹 Step 1: Adding Resumes...");
  
  // PERFECT MATCH EXAMPLE 1: Almost identical wording and structure
  await createOrUpdateResumeEmbedding(
    "resume-perfect-match-1", 
    "Senior software engineer with 8+ years of full-stack development experience, specializing in TypeScript, React, Node.js, and AWS. Led development of scalable web applications serving millions of users. Strong expertise in CI/CD pipelines, clean architecture, and performance optimization. Proven ability to mentor junior developers and implement modern front-end and back-end best practices.",
    "Senior",
    ["TypeScript", "React", "Node.js", "AWS", "CI/CD", "Full-Stack Development"],
    "Technology"
  );

  // PERFECT MATCH EXAMPLE 2: Carefully aligned ML engineer profile
  await createOrUpdateResumeEmbedding(
    "resume-perfect-match-2",
    "Machine learning engineer with PhD in Computer Science and 5+ years of industry experience in natural language processing and transformer models. Published researcher in the field of large language models. Expert in Python, PyTorch, TensorFlow, and deploying ML models to production. Experience optimizing models for efficiency and developing custom embedding solutions for similarity search applications.",
    "Senior",
    ["Machine Learning", "NLP", "Python", "PyTorch", "TensorFlow", "Transformers", "LLMs"],
    "Artificial Intelligence"
  );

  // Regular examples with decent but not perfect matching
  await createOrUpdateResumeEmbedding(
    "resume-101",
    "Software engineer experienced in TypeScript, React, and Node.js. Built several web applications and REST APIs.",
    "Mid-level",
    ["TypeScript", "React", "Node.js", "REST APIs"],
    "Technology"
  );

  await createOrUpdateResumeEmbedding(
    "resume-102",
    "Machine learning engineer skilled in NLP, deep learning, and model deployment. Experience with Python and TensorFlow.",
    "Mid-level",
    ["Machine Learning", "NLP", "Python", "TensorFlow"],
    "Technology"
  );

  // Add unrelated resumes (for better demonstration)
  await createOrUpdateResumeEmbedding(
    "resume-103",
    "Graphic designer with a passion for creating stunning visuals. Expert in Adobe Creative Suite.",
    "Mid-level",
    ["Graphic Design", "Photoshop", "Illustrator", "UI Design"],
    "Design"
  );

  await createOrUpdateResumeEmbedding(
    "resume-104",
    "Marketing specialist with expertise in digital marketing strategies, SEO, and content creation.",
    "Mid-level",
    ["Digital Marketing", "SEO", "Content Creation", "Social Media"],
    "Marketing"
  );

  await createOrUpdateResumeEmbedding(
    "resume-105",
    "pastry chef with no experience in creating gourmet desserts and pastries. Doesn't know anything about French patisserie techniques, chocolate tempering, and sugar art. Doesn't know anything about pastry. Doesn't know anything about culinary arts. Doesn't know anything about desserts. Doesn't know anything about pastries.",
    "No Experience",
    [],
    "Culinary Arts"
  );

  console.log("\n🔹 Step 2: Adding Job Descriptions...");
  
  // PERFECT MATCH JOB 1: Almost identical to perfect match resume 1
  await createOrUpdateJobEmbedding(
    "job-perfect-match-1",
    "We are hiring a Senior Full-Stack Software Engineer with 8+ years of experience in scalable web application development. Must be an expert in TypeScript, React, Node.js, AWS, and CI/CD pipelines. Responsibilities include leading development teams, mentoring junior developers, and ensuring high-performance, scalable code aligned with best practices in modern front-end and back-end architectures.",
    "Senior",
    ["TypeScript", "React", "Node.js", "AWS", "CI/CD", "Full-Stack Development"],
    "Technology"
  );

  // PERFECT MATCH JOB 2: Nearly identical to perfect match resume 2
  await createOrUpdateJobEmbedding(
    "job-perfect-match-2",
    "Looking for a machine learning engineer with advanced degree in Computer Science and 5+ years of industry experience in natural language processing and transformer models. Must have publication history in large language models. Required skills: Python, PyTorch, TensorFlow, and experience deploying ML models to production. Will be responsible for optimizing models for efficiency and developing custom embedding solutions for similarity search applications.",
    "Senior",
    ["Machine Learning", "NLP", "Python", "PyTorch", "TensorFlow", "Transformers", "LLMs"],
    "Artificial Intelligence"
  );

  // Create relevant job descriptions with good but not perfect matching
  await createOrUpdateJobEmbedding(
    "job-201",
    "Looking for a full-stack software engineer with React and Node.js experience. Must be comfortable with TypeScript and building REST APIs.",
    "Mid-level",
    ["React", "Node.js", "TypeScript", "REST APIs"],
    "Technology"
  );

  await createOrUpdateJobEmbedding(
    "job-202",
    "Seeking a machine learning engineer for NLP projects. Experience with Python and TensorFlow required.",
    "Mid-level",
    ["NLP", "Machine Learning", "Python", "TensorFlow"],
    "Technology"
  );

  // Add unrelated jobs (for better demonstration)
  await createOrUpdateJobEmbedding(
    "job-203",
    "Hiring a creative graphic designer to join our design team. Must be proficient in Adobe Creative Suite.",
    "Mid-level",
    ["Photoshop", "Illustrator", "UI Design"],
    "Design"
  );

  await createOrUpdateJobEmbedding(
    "job-204",
    "Looking for a marketing specialist to enhance our digital presence through SEO and content creation.",
    "Mid-level",
    ["SEO", "Content Creation", "Social Media"],
    "Marketing"
  );

  await createOrUpdateJobEmbedding(
    "job-205",
    "We are hiring a pastry chef with 10+ years of experience in creating gourmet desserts and pastries. Must be an expert in French patisserie techniques, chocolate tempering, and sugar art. Must have led a team of pastry chefs in a Michelin-starred restaurant. Strong focus on flavor balance, presentation, and innovative dessert creation. We value creativity and candidates who can mentor junior pastry chefs.",
    "Senior",
    ["Pastry", "Desserts", "Chocolate Tempering", "Sugar Art", "French Patisserie"],
    "Culinary Arts"
  );

  console.log("\n🔹 Step 3: AI-Powered Job Matching (Finding Best Matches)...");

  // **Finding best matches with similarity scores**
  async function logMatchingResults(
    searchFunction: (id: string, limit?: number) => Promise<{ title: string; similarity: number }[]>,
    searchFor: string,
    type: "resume" | "job"
  ) {
    const results = await searchFunction(searchFor);

    if (results.length === 0) {
      console.log(`❌ No matches found for ${searchFor} (${type})`);
      return;
    }

    console.log(`\n✅ Matches for ${searchFor} (${type}):`);
    results.forEach(({ title, similarity }, index) => {
      // Highlight high similarity matches
      const similarityPercent = (similarity * 100).toFixed(2);
      const rating = similarity >= 0.9 ? "⭐⭐⭐ PERFECT MATCH" : 
                    similarity >= 0.75 ? "⭐⭐ EXCELLENT MATCH" : 
                    similarity >= 0.6 ? "⭐ GOOD MATCH" : 
                    similarity >= 0.5 ? "🔹 POSSIBLE MATCH" :
                    similarity >= 0.4 ? "🔸 WEAK MATCH" : "❌ NO MATCH";
      console.log(`  ${index + 1}. ${title} (Similarity: ${similarityPercent}%) - ${rating}`);
    });
  }

  // Test our perfect matches first
  console.log("\n🔍 TESTING HIGH-SIMILARITY MATCHES:");
  await logMatchingResults(findMatchingJobs, "resume-perfect-match-1", "resume");
  await logMatchingResults(findMatchingJobs, "resume-perfect-match-2", "resume");
  await logMatchingResults(findMatchingResumes, "job-perfect-match-1", "job");
  await logMatchingResults(findMatchingResumes, "job-perfect-match-2", "job");

  // Finding the best job for each resume
  console.log("\n🔍 REGULAR MATCHING EXAMPLES:");
  await logMatchingResults(findMatchingJobs, "resume-101", "resume"); // Regular software engineer
  await logMatchingResults(findMatchingJobs, "resume-102", "resume"); // Regular ML engineer
  await logMatchingResults(findMatchingJobs, "resume-103", "resume"); // Alice Brown (should match Graphic Design)
  await logMatchingResults(findMatchingJobs, "resume-104", "resume"); // Bob White (should match Marketing)

  // Finding the best candidates for each job
  await logMatchingResults(findMatchingResumes, "job-201", "job"); // Regular full-stack job
  await logMatchingResults(findMatchingResumes, "job-202", "job"); // Regular ML engineer job
  await logMatchingResults(findMatchingResumes, "job-203", "job"); // Graphic Designer (should match Alice)
  await logMatchingResults(findMatchingResumes, "job-204", "job"); // Marketing Specialist (should match Bob)

  await logMatchingResults(findMatchingResumes, "job-205", "job"); // Pastry Chef (should match Alice)

  console.log("\n🎯 Demo Complete! You've just seen AI-powered job matching in action, including perfect matches with 90%+ similarity.");
}

async function main() {
  console.log("\n🔄 Initializing AI-Powered Job Matching System...");
  
  await setupEmbeddings();
  await setupDatabase();
  
  await jobMatchingDemo();
}

main();
