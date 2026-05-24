export interface Flashcard {
  question: string;
  answer: string;
  hint: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number; // Index of the correct option
  explanation: string;
}

export interface TranscriptLine {
  text: string;
  time: string;
  seconds: number;
}

export interface YoutubeChapter {
  title: string;
  time: string;
  seconds: number;
}

export interface StudyItem {
  id: string;
  title: string;
  createdAt: string;
  kind: "pdf" | "youtube" | "website" | "text" | "research";
  fileName?: string;
  content: string; // Left-panel content (scraped text, plain text, research markdown)
  localFileUrl?: string;
  youtubeUrl?: string;
  videoId?: string;
  chapters?: YoutubeChapter[];
  transcript?: TranscriptLine[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  notes: string;
  briefingDoc?: string;
  audioScript?: { speaker: string; text: string }[];
  pinnedNotes?: { id: string; content: string }[];
  chatHistory: { role: "user" | "assistant"; content: string }[];
}

// ---------------------------------------------------------
// 1. SAMPLE PDF CONTENTS
// ---------------------------------------------------------
export const MOCK_PDF_INDUSTRIAL_AUTOMATION = {
  title: "Industrial Automation and Control (213MEC2313)",
  fileName: "Industrial_Automation_Unit1_Notes.pdf",
  content: `Course: 213MEC2313 - Industrial Automation and Control
II Year Professional Elective Course
Kalasalingam Academy of Research and Education

Unit 1: Introduction to Industrial Automation
- Definition: Industrial Automation is the use of control systems, such as computers or robots, and information technologies for handling different processes and machineries in an industry to replace human beings.
- Key Components:
  1. Sensors (e.g., thermocouples, encoders, limit switches) - Measure physical quantities and convert them to signals.
  2. Actuators (e.g., solenoids, motors, pneumatic cylinders) - Convert electrical signals into mechanical action.
  3. Programmable Logic Controllers (PLCs) - Solid-state control systems with user-programmable memory for storing instructions to implement functions like logic, sequencing, timing, and arithmetic.
  4. Supervisory Control and Data Acquisition (SCADA) - System of software and hardware elements that allows industrial organizations to control processes locally or at remote locations.
- Benefits:
  - High productivity & efficiency.
  - Superior product quality.
  - Increased safety for human workers (operating in hazardous conditions).
  - Reduced routine checking and operating costs.
- Automation Hierarchy:
  1. Field Level (Sensors, Actuators)
  2. Control Level (PLCs, PID controllers)
  3. Supervisory Level (SCADA, HMI)
  4. Enterprise Level (MES, ERP)`,
  flashcards: [
    {
      question: "What is industrial automation described as in the lesson?",
      answer: "Industrial Automation is the use of control systems (such as computers, PLCs, or robots) and information technologies to handle industrial processes and machinery, replacing repetitive human work and improving precision.",
      hint: "It replaces repetitive human work and checks for mistakes.",
    },
    {
      question: "What is a PLC and what is its role?",
      answer: "A Programmable Logic Controller (PLC) is a ruggedized industrial computer used to control manufacturing processes. It reads inputs from sensors, processes them based on custom logic, and controls actuators.",
      hint: "Stands for Programmable Logic Controller.",
    },
    {
      question: "What are the main benefits of industrial automation?",
      answer: "Key benefits include increased productivity, reduced operation costs, improved product quality, minimized human error, and enhanced safety by keeping workers away from hazardous environments.",
      hint: "Think efficiency, safety, and cost reduction.",
    },
    {
      question: "What is the difference between sensors and actuators?",
      answer: "Sensors detect and measure physical properties (like temperature, pressure, or motion) and send signals. Actuators receive signals and perform physical actions (like opening a valve or spinning a motor).",
      hint: "One senses, the other acts.",
    },
    {
      question: "What is SCADA?",
      answer: "SCADA stands for Supervisory Control and Data Acquisition. It is a control system architecture that uses computers, networked data communications, and graphical user interfaces for high-level process supervisory management.",
      hint: "Supervisory Control and Data...",
    },
  ],
  quiz: [
    {
      question: "Which device is responsible for converting electrical control signals into physical movement?",
      options: ["Sensor", "Actuator", "PLC", "SCADA"],
      answer: 1,
      explanation: "Actuators (like motors and solenoids) execute physical actions based on control signals, whereas sensors detect signals, and PLCs make logic decisions.",
    },
    {
      question: "What does PLC stand for?",
      options: [
        "Pneumatic Logic Controller",
        "Programmable Linear Computer",
        "Programmable Logic Controller",
        "Process Level Control",
      ],
      answer: 2,
      explanation: "PLC stands for Programmable Logic Controller, a digital computer used for industrial automation control.",
    },
    {
      question: "At which level of the automation hierarchy does SCADA operate?",
      options: ["Field Level", "Control Level", "Supervisory Level", "Enterprise Level"],
      answer: 2,
      explanation: "SCADA operates at the Supervisory Level (Level 3), monitoring and gathering data from devices at lower levels (Field and Control).",
    },
  ],
};

export const MOCK_PDF_QUANTUM_COMPUTING = {
  title: "Introduction to Quantum Computing (CS402)",
  fileName: "Introduction_to_Quantum_Computing.pdf",
  content: `CS402: Introduction to Quantum Computing
Department of Computer Science

Unit 1: Quantum Foundations
- Classical vs Quantum bits:
  - Qubit (Quantum bit): The basic unit of quantum information. Unlike a classical bit (which can only be 0 or 1), a qubit can exist in a linear combination of both states simultaneously due to superposition.
  - State representation: |ψ⟩ = α|0⟩ + β|1⟩, where α and β are complex probability amplitudes, satisfying |α|² + |β|² = 1.
- Quantum Principles:
  1. Superposition: Ability of a quantum system to be in multiple states at once until measured.
  2. Entanglement: A unique quantum link where the state of one particle instantly determines the state of another, no matter the distance between them. Einstein called this 'spooky action at a distance'.
  3. Quantum Interference: The addition of quantum states that can be constructive (amplifying correct answers) or destructive (cancelling wrong answers).
- Quantum Gates:
  - Hadamard (H) Gate: Creates superposition by transforming |0⟩ to (|0⟩ + |1⟩)/√2.
  - Pauli-X Gate: Quantum equivalent of classical NOT gate (flips |0⟩ to |1⟩).
  - CNOT (Controlled-NOT) Gate: Entangles two qubits. Flips the target qubit if the control qubit is 1.`,
  flashcards: [
    {
      question: "What is a Qubit?",
      answer: "A qubit (quantum bit) is the basic unit of quantum information. It is the quantum analogue of the classical binary bit, capable of being in a state of superposition (representing 0, 1, or both simultaneously).",
      hint: "Quantum equivalent of a classical bit.",
    },
    {
      question: "Explain Quantum Superposition.",
      answer: "Superposition is a principle of quantum mechanics where a system can exist in multiple states or configurations at the same time, until it is measured, collapsing it into a single state.",
      hint: "Being in two states at once.",
    },
    {
      question: "What is Quantum Entanglement?",
      answer: "Entanglement is a phenomenon where two or more quantum particles become interconnected in such a way that the quantum state of each particle cannot be described independently, even when separated by vast distances.",
      hint: "'Spooky action at a distance'.",
    },
    {
      question: "What does a Hadamard (H) gate do?",
      answer: "The Hadamard gate puts a qubit into a state of equal superposition. It maps the basis states |0⟩ and |1⟩ to (|0⟩ + |1⟩)/√2 and (|0⟩ - |1⟩)/√2, respectively.",
      hint: "Creates superposition.",
    },
  ],
  quiz: [
    {
      question: "Which quantum gate is primarily used to create superposition?",
      options: ["Pauli-X Gate", "Hadamard (H) Gate", "CNOT Gate", "Phase Gate"],
      answer: 1,
      explanation: "The Hadamard (H) gate maps a definite state (like |0⟩) to an equal superposition of |0⟩ and |1⟩.",
    },
    {
      question: "What is the equation representing the probability conservation of a qubit state?",
      options: [
        "α + β = 1",
        "α² - β² = 1",
        "|α|² + |β|² = 1",
        "α × β = 0",
      ],
      answer: 2,
      explanation: "Since |α|² and |β|² represent the probabilities of measuring state |0⟩ and |1⟩ respectively, their sum must equal 1.",
    },
  ],
};

// ---------------------------------------------------------
// 2. SAMPLE YOUTUBE CONTENTS
// ---------------------------------------------------------
export const MOCK_YOUTUBE_INTERNSHIP = {
  title: "No Experience? How to Get Internships In 2026 (Telugu)",
  youtubeUrl: "https://www.youtube.com/watch?v=6PZX-v-y0bE",
  videoId: "6PZX-v-y0bE",
  chapters: [
    { title: "Introduction & Market Reality 2026", time: "00:00", seconds: 0 },
    { title: "Skill Building & Portfolio Creation", time: "03:15", seconds: 195 },
    { title: "Resumes & AI Filtering Secrets", time: "07:45", seconds: 465 },
    { title: "Networking & LinkedIn Strategies", time: "12:30", seconds: 750 },
    { title: "Where to Apply (Naukri, Internshala, LinkedIn)", time: "18:10", seconds: 1090 },
    { title: "Cracking the Technical Interview", time: "22:40", seconds: 1360 },
  ],
  transcript: [
    { text: "Hey guys, welcome back to Think IT Telugu! Today we are discussing internships in 2026.", time: "00:00", seconds: 0 },
    { text: "Chala mandi adugutunnaru: 'Anna, current market lo market state ela undi? Direct jobs ravatledu, internships ki apply cheyala?'", time: "00:20", seconds: 20 },
    { text: "Yes! 2026 lo internships are highly critical because direct recruitment functions chala taggayi, companies want to check you first.", time: "00:45", seconds: 45 },
    { text: "First thing, no experience unnappudu, basic skills lekunda direct ga resume apply cheste directly filter ayipotundi.", time: "01:20", seconds: 80 },
    { text: "Let's talk about the roadmap. Step 1 build dynamic skills. General ga core programming like Python or Java nerchukondi.", time: "02:10", seconds: 130 },
    { text: "Next, database management updates (SQL/MongoDB) and some basic Cloud concepts like AWS or GitHub properties.", time: "03:00", seconds: 180 },
    { text: "Step 2 is portfolio. HTML page or generic code copy-paste cheste review chesevallu reject chestaru.",
      time: "03:30", seconds: 210 },
    { text: "Build 2-3 solid real-world projects. E.g., an automated task dashboard or an AI summarizer app.", time: "04:30", seconds: 270 },
    { text: "Design your project code nicely and deploy it on Vercel or Netlify. Add GitHub code link.", time: "05:50", seconds: 350 },
    { text: "Step 3, Resume writing. Use single column templates. ATS (Applicant Tracking Systems) don't scan complex double column charts.", time: "07:45", seconds: 465 },
    { text: "Avoid general descriptions. Use active phrases: 'Optimized query time by 30%' instead of 'Worked on SQL database'.", time: "09:00", seconds: 540 },
    { text: "Step 4: LinkedIn. Optimise your profile headline. Mention skills like 'React developer, Node.js enthusiast' instead of just 'Student'.", time: "12:30", seconds: 750 },
    { text: "Try to connect with HR recruiters and developers working in your target startups. Drop brief, formal notes.", time: "14:15", seconds: 855 },
    { text: "Step 5, Platforms. Apply on LinkedIn Jobs, Naukri, and Internshala daily. Target 10-15 applications per week.", time: "18:10", seconds: 1090 },
    { text: "Startups are the best place for beginners. They teach you more, process applications fast, and have less rigid filters.", time: "20:00", seconds: 1200 },
    { text: "Finally, interviews. Practice mock interviews. Explain your projects clearly, write dry runs of code on paper.", time: "22:40", seconds: 1360 },
    { text: "All the best guys! Check links in description. Don't forget to subscribe to Think IT Telugu.", time: "25:00", seconds: 1500 },
  ],
  content: `YouTube Title: No Experience? How to Get Internships In 2026 (Telugu)
Channel: Think IT Telugu
Duration: 25 minutes

Key Roadmap Points:
1. Skills required: Base programming language (Java/Python/JS), SQL database, Git/GitHub, and cloud deployment basics.
2. Projects: Need 2-3 functional web projects deployed live (Vercel/Netlify). No standard clone templates.
3. Resume: Single column formatting, keyword optimized for ATS, metrics-driven achievements.
4. LinkedIn: Profile optimization (Headline & Summary), direct messaging to recruiters and technical leads.
5. Platforms: Consistent application routine on Internshala, LinkedIn, and Naukri. Focus on fast-moving startups.`,
  flashcards: [
    {
      question: "What type of resume format is recommended for ATS filtering?",
      answer: "A clean, single-column resume template with simple headings, bullet points, and no complex graphics, columns, or tables is recommended, as ATS (Applicant Tracking Systems) read it much better.",
      hint: "Single column vs double column.",
    },
    {
      question: "What is Step 1 of the internship roadmap outlined in the video?",
      answer: "Step 1 is Skill Building. Learn a core language (Java, Python, or JS/TypeScript), database management (SQL or MongoDB), version control (Git), and deployment basics.",
      hint: "Foundation before building projects.",
    },
    {
      question: "Which platforms should beginners target for internship applications?",
      answer: "The video recommends active, daily applications on Internshala, LinkedIn Jobs, and Naukri, with a special emphasis on applying to early/growth-stage startups.",
      hint: "Name the three platforms.",
    },
  ],
  quiz: [
    {
      question: "What should you focus on when writing descriptions for your resume projects?",
      options: [
        "Include as much decoration and icons as possible",
        "Write long paragraphs describing the company history",
        "Use metrics-driven, impact-focused descriptions (e.g. 'optimized by 30%')",
        "List only the project title without details",
      ],
      answer: 2,
      explanation: "Using metrics and action verbs helps prove that you understand your work and provides concrete evidence of your skills.",
    },
    {
      question: "Why does the speaker recommend applying to startups?",
      options: [
        "Startups pay the highest salaries in the world",
        "Startups process applications faster and provide more hands-on learning experiences",
        "Startups never test programming skills",
        "Startups do not require resumes",
      ],
      answer: 1,
      explanation: "Startups generally have shorter hiring cycles, fewer corporate filters, and interns get to work on actual core code rather than minor tasks.",
    },
  ],
};

// ---------------------------------------------------------
// 3. GENERATOR HELPERS
// ---------------------------------------------------------

// Helper to scrape/generate mock website content
export function generateMockWebsiteContent(url: string): { title: string; content: string; flashcards: Flashcard[]; quiz: QuizQuestion[] } {
  let domain = "Web Resource";
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace("www.", "");
  } catch {
    domain = url.replace("https://", "").replace("http://", "").split("/")[0];
  }

  const title = `Webpage Content: ${domain}`;
  const content = `Scraped Resource from: ${url}
Retrieved on: ${new Date().toLocaleDateString()}
Title: Inside the Tech Trends of ${new Date().getFullYear()}

Overview:
Web content extracted successfully from domain ${domain}. The text content focuses on the rise of browser-side application execution, hybrid computing structures, and autonomous web agents.

Key Findings:
1. Browser Capabilities: Modern browser architectures allow complex AI processing to occur client-side, reducing server costs and protecting user data privacy.
2. Web Scrapers & Crawlers: Autonomous agents are becoming the primary consumers of web traffic, demanding cleaner semantic HTML markup and schema formatting.
3. Single Page Applications: Frameworks are evolving to support server-actions and partial pre-rendering to optimize loading times across low-connectivity regions.
4. Privacy & Compliance: Decentralized cookies, zero-party data storage, and localized compliance systems are changing the monetization methods of web portals.

Conclusion:
Web developments in the next decade are revolving around low latency, edge computational power, and specialized agent interactions.`;

  const flashcards: Flashcard[] = [
    {
      question: "Why is client-side AI processing beneficial according to the scraped text?",
      answer: "It reduces server hosting costs and preserves user data privacy by doing processing locally in the browser instead of transmitting everything to remote servers.",
      hint: "Think about data transmission and server costs.",
    },
    {
      question: "What is the primary trend in monetization mentioned?",
      answer: "Monetization methods are changing due to decentralized cookies, zero-party data storage, and localized compliance rules.",
      hint: "Related to user tracking and cookies.",
    },
  ];

  const quiz: QuizQuestion[] = [
    {
      question: "What demands cleaner semantic HTML markup and schema formatting on modern sites?",
      options: ["Search engine algorithms only", "Autonomous AI agents and scrapers", "Internet Service Providers", "Browser extensions"],
      answer: 1,
      explanation: "Autonomous agents are becoming key consumers of web data, requiring sites to be structured cleanly so that data extraction can happen without friction.",
    },
  ];

  return { title, content, flashcards, quiz };
}

// Helper to create a study guide from plain text input
export function generateMockTextContent(text: string): { title: string; content: string; flashcards: Flashcard[]; quiz: QuizQuestion[] } {
  const wordCount = text.trim().split(/\s+/).length;
  const snippet = text.slice(0, 40) + (text.length > 40 ? "..." : "");
  const title = `Pasted Notes (${wordCount} words)`;
  
  // Create generic study questions based on the text
  const flashcards: Flashcard[] = [
    {
      question: "What is the main topic of the pasted text?",
      answer: `Based on the source: "${snippet}", the text discusses various aspects of learning, memory recall, or general technical notes, focusing on: "${text.slice(0, 150)}..."`,
      hint: "Read the opening lines of your text.",
    },
    {
      question: "Summary of the text's key points",
      answer: text.length > 500 
        ? `Here is an extract summary: ${text.slice(0, 300)}...`
        : `The text is a short note that states: "${text}"`,
      hint: "A quick review of the pasted contents.",
    },
  ];

  const quiz: QuizQuestion[] = [
    {
      question: `Which of the following topics best captures the text: "${snippet}"?`,
      options: [
        "Scientific concepts and academic theory",
        "Technical systems and implementation guides",
        "Custom notes provided by the user",
        "General literature and fiction",
      ],
      answer: 2,
      explanation: "This resource was generated from custom notes pasted into the infinity text editor block.",
    },
  ];

  return { title, content: text, flashcards, quiz };
}

// Helper to generate YouTube details for custom link input
export function generateMockYoutubeContent(url: string): { title: string; content: string; videoId: string; chapters: YoutubeChapter[]; transcript: TranscriptLine[]; flashcards: Flashcard[]; quiz: QuizQuestion[] } {
  let videoId = "dQw4w9WgXcQ"; // Rickroll by default
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    videoId = match[2];
  }

  const title = `YouTube Lecture Analysis (${videoId})`;
  const content = `YouTube Resource: ${url}
Video ID: ${videoId}
Analysis generated on: ${new Date().toLocaleDateString()}

Key Concepts Analysed:
1. Video Structure: The presentation covers detailed explanations, diagrams, and summary items.
2. Core Theory: A comprehensive lecture discussing structural mechanics, design patterns, or learning processes.
3. Summary of Video Content: The video walks through step-by-step methods, illustrating how modern methodologies can be applied to optimize outcomes.`;

  const chapters: YoutubeChapter[] = [
    { title: "Lecture Introduction", time: "00:00", seconds: 0 },
    { title: "Core Concepts Demonstration", time: "02:30", seconds: 150 },
    { title: "Practical Examples", time: "05:45", seconds: 345 },
    { title: "Summary & Outro", time: "09:20", seconds: 560 },
  ];

  const transcript: TranscriptLine[] = [
    { text: "Welcome to this specialized online class. Today we are going to dive deep into our syllabus topic.", time: "00:00", seconds: 0 },
    { text: "Let's first define our goals: we want to understand the foundational ideas and map out our studies.", time: "00:30", seconds: 30 },
    { text: "Now let's examine the first diagram. Notice how inputs map to the control blocks.", time: "02:30", seconds: 150 },
    { text: "This is crucial for exams. Professors love asking questions about this particular relationship.", time: "03:45", seconds: 225 },
    { text: "Moving on, let's take a look at a real-world coding or design example.", time: "05:45", seconds: 345 },
    { text: "If we change the parameters, the system adapts instantly. This is active optimization.", time: "07:15", seconds: 435 },
    { text: "To summarize, review the key points: understand definitions, practice diagrams, and do dry runs.", time: "09:20", seconds: 560 },
    { text: "Thanks for watching. Make sure to download the worksheet in the description below.", time: "10:00", seconds: 600 },
  ];

  const flashcards: Flashcard[] = [
    {
      question: "What is highlighted as a critical area for exam preparation?",
      answer: "The instructor highlights the first diagram showing inputs mapping to control blocks as a key question professors love to ask.",
      hint: "Around the 03:45 timestamp.",
    },
    {
      question: "What advice is given at the end of the video?",
      answer: "The video advises to understand definitions, practice drawing the diagrams, do dry runs, and download the description worksheet.",
      hint: "Watch the outro summary.",
    },
  ];

  const quiz: QuizQuestion[] = [
    {
      question: "What is demonstrated in the middle section of the video (starting at 05:45)?",
      options: [
        "A history of quantum hardware",
        "A practical real-world coding/design example showing active parameter updates",
        "A quiz feedback collection form",
        "A marketing pitch for study memberships",
      ],
      answer: 1,
      explanation: "At 05:45, the lecture transitions to practical examples illustrating dynamic parameter changes and active optimization.",
    },
  ];

  return { title, content, videoId, chapters, transcript, flashcards, quiz };
}

// Helper to generate a multi-step Deep Research paper
export function generateMockResearchContent(topic: string): { title: string; content: string; flashcards: Flashcard[]; quiz: QuizQuestion[] } {
  const title = `Deep Research: ${topic}`;
  const content = `# Deep Research Report: ${topic}
Generated by LearnX Research Agent v1.0
Date: ${new Date().toLocaleDateString()}

## Abstract
This comprehensive report investigates the current technical landscape, historical trajectory, core mechanism, and emerging debates surrounding **${topic}**. By analyzing academic publications, tech industry whitepapers, and web databases, this paper synthesizes the essential facets of the topic.

---

## 1. Introduction
The subject of **${topic}** has garnered significant attention in contemporary research due to its capacity to restructure current systems, introduce new capabilities, and create efficiencies. In this section, we lay out the fundamental definitions and parameters of the study. 

The primary significance lies in its integration with wider computational, mechanical, or cultural frameworks, prompting a re-evaluation of established practices.

---

## 2. Core Mechanisms and Architecture
To understand **${topic}**, one must examine the critical components that drive its development:
- **Foundational Principles**: The governing logic and theories (e.g., algorithmic constraints, physical laws, or behavioral trends).
- **Data Pipelines / Input Methods**: How information is ingested, cleaned, and processed to maintain high fidelity.
- **Feedback Loops**: The corrective cycles that refine accuracy, reduce entropy, and maximize output quality over successive iterations.

| Stage | Process Description | Key Performance Metric |
| :--- | :--- | :--- |
| Phase 1 | Initial Intake & Mapping | Structural Integrity Rate |
| Phase 2 | Transformational Analysis | Convergence Speed |
| Phase 3 | Final Synthesis | Fidelity / Relevance Score |

---

## 3. Leading Industry Applications
Currently, **${topic}** is finding practical deployment in several domains:
1. **Academic Modeling**: Simulating edge conditions to validate theoretical models.
2. **Industrial Control**: Optimizing large-scale logistics, automated scripts, and system loops.
3. **Consumer Technology**: Powering recommendation feeds, natural interfaces, and custom compilation pipelines.

---

## 4. Challenges, Limitations, and Future Outlook
Despite promising strides, several obstacles hinder universal adoption:
- **Resource Constraints**: High processing demands, specialized hardware dependencies, and operational overhead.
- **Safety and Reliability**: Ensuring outputs remain deterministic, safe, and explainable under anomalous inputs.
- **Interoperability**: Fitting into legacy infrastructures without creating critical point failures.

The next five years will likely see research shifting toward low-power architectures, specialized micro-models, and enhanced open-source sharing standards.

---

## 5. Conclusion
In summary, **${topic}** represents a pivotal area of growth that unites diverse technical specializations. Addressing the problems of resource consumption and control fidelity will unlock the next generation of scalable applications.`;

  const flashcards: Flashcard[] = [
    {
      question: `What is the main bottleneck preventing widespread adoption of ${topic}?`,
      answer: "The primary challenges include high resource/processing demands, specialized hardware requirements, safety concerns under anomalous inputs, and legacy system interoperability.",
      hint: "Refer to Section 4: Challenges.",
    },
    {
      question: `How are the three phases of ${topic}'s mechanism structured?`,
      answer: "Phase 1: Initial Intake & Mapping (Metric: Structural Integrity). Phase 2: Transformational Analysis (Metric: Convergence Speed). Phase 3: Final Synthesis (Metric: Fidelity/Relevance).",
      hint: "Check the table in Section 2.",
    },
  ];

  const quiz: QuizQuestion[] = [
    {
      question: `According to the report on ${topic}, what is research likely to shift toward in the next five years?`,
      options: [
        "Larger, single-site centralized mainframes",
        "Low-power architectures, specialized micro-models, and open-source standards",
        "Eliminating software testing phases entirely",
        "Reverting back to manual mechanical systems",
      ],
      answer: 1,
      explanation: "Section 4 highlights that future research focuses on mitigating resource constraints via low-power designs, compact micro-models, and open collaboration.",
    },
  ];

  return { title, content, flashcards, quiz };
}

// ---------------------------------------------------------
// 4. SMART Q&A CHAT ENGINE (NotebookLM-style agent response)
// ---------------------------------------------------------
export function getSmartAgentResponse(query: string, item: StudyItem): string {
  const q = query.toLowerCase();

  // General questions response
  if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
    return `Hello! I'm your AI Tutor. I've analyzed **${item.title}** and I'm ready to help you study. You can ask me to summarize it, explain specific terms, or write a practice quiz for you!`;
  }

  if (q.includes("summarize") || q.includes("summary") || q.includes("main idea") || q.includes("overview")) {
    if (item.kind === "pdf" && item.title.includes("Industrial Automation")) {
      return `### Summary of Industrial Automation & Control
This document introduces **Industrial Automation** (using control systems and PLCs to replace repetitive human processes). 

**Key Takeaways:**
1. **Automation Hierarchy**: Ranges from Field level (sensors/actuators) up to Control (PLCs) and Supervisory (SCADA).
2. **PLCs**: The brains of the control level, processing inputs to trigger output actuators.
3. **Benefits**: Increased throughput, enhanced worker safety, and consistent product quality.`;
    }
    
    if (item.kind === "youtube" && item.title.includes("Internship")) {
      return `### Summary of "How to Get Internships In 2026"
This video details a 5-step career roadmap for students with no prior experience looking to secure tech internships:

**Key Milestones:**
1. **Skills**: Focus on programming (Java/Python), SQL, Git, and basic deployment.
2. **Projects**: Build 2-3 live web apps rather than cloning code.
3. **ATS Resume**: Keep resume format simple and single-column.
4. **LinkedIn & Outreach**: Target startup HR and engineers with custom notes.`;
    }

    if (item.kind === "research") {
      return `### Research Summary: ${item.title}
This deep research report covers the following areas regarding the topic:
1. **Foundations**: System definition, architectural principles, and processing phases.
2. **Process Workflow**: Initial Intake, Transformational Analysis, and Synthesis.
3. **Practical Use**: Academic simulations, industrial optimization, and tech deployment.
4. **Core Hurdles**: High CPU/GPU usage, security barriers, and interoperability concerns.`;
    }

    return `### Executive Summary
Here is a summary of the resource **${item.title}**:
* **Subject Focus**: General study material focusing on concepts presented in the text.
* **Core Idea**: Providing structured explanations to facilitate study and active recall.
* **Recommendation**: Ask me specific questions about terms in this text, or try the **Tutor** tab for flashcards.`;
  }

  // PDF-specific Q&A keywords
  if (item.kind === "pdf" && item.title.includes("Industrial Automation")) {
    if (q.includes("plc") || q.includes("programmable logic")) {
      return `According to Unit 1, a **Programmable Logic Controller (PLC)** is a solid-state control system with user-programmable memory. 
      
It stores instructions to execute functions like:
- Logic
- Sequencing
- Timing
- Arithmetic
It occupies the **Control Level** in the automation hierarchy, reading inputs from sensors and writing to actuators.`;
    }
    if (q.includes("scada")) {
      return `**SCADA** (Supervisory Control and Data Acquisition) operates at the **Supervisory Level** (above PLCs). It consists of software and hardware elements that gather real-time data from field devices to monitor and control industrial processes across remote locations.`;
    }
    if (q.includes("sensor") || q.includes("actuator")) {
      return `Unit 1 defines:
- **Sensors** (e.g., thermocouples, encoders): Measure physical attributes and translate them into electric signals.
- **Actuators** (e.g., motors, pneumatic cylinders): Turn electrical command signals into physical force or mechanical movement.`;
    }
    if (q.includes("level") || q.includes("hierarchy")) {
      return `The **Automation Hierarchy** consists of four levels:
1. **Field Level** (Sensors, Actuators)
2. **Control Level** (PLCs, PID controllers)
3. **Supervisory Level** (SCADA, HMI)
4. **Enterprise Level** (MES, ERP software)`;
    }
  }

  // YouTube-specific Q&A keywords
  if (item.kind === "youtube" && item.title.includes("Internship")) {
    if (q.includes("resume") || q.includes("ats")) {
      return `In the resume section (starting around **07:45**), the video advises:
- Use **single-column templates** so ATS software doesn't fail scanning.
- Use **action-oriented, metrics-driven descriptions** (e.g., 'Optimized query latency by 30%') instead of passive statements ('Responsible for SQL database').`;
    }
    if (q.includes("linkedin")) {
      return `The speaker suggests optimizing your LinkedIn profile headline at **12:30**. 
      
Instead of writing just 'Student', use descriptive, searchable terms like 'React developer, Node.js enthusiast'. He also recommends sending quick, polite messages directly to startup founders or tech leads to inquire about openings.`;
    }
    if (q.includes("project") || q.includes("portfolio")) {
      return `For projects, the speaker warns against standard copying of YouTube templates. Instead, build **2-3 real, functional apps** (like an AI note-taker or automated scheduler) and make sure they are **live** on Vercel/Netlify with a linked GitHub repository.`;
    }
    if (q.includes("telugu") || q.includes("channel")) {
      return `This video is hosted by the channel **Think IT Telugu**, which publishes technology tutorials, career guidance, and IT roadmap advice for Telugu-speaking audiences.`;
    }
  }

  // Quantum computing PDF keywords
  if (item.title.includes("Quantum Computing")) {
    if (q.includes("qubit")) {
      return `A **qubit** (quantum bit) is the quantum version of a classical bit. While classical bits are strictly 0 or 1, a qubit exists in a superposition: |ψ⟩ = α|0⟩ + β|1⟩, meaning it can represent both states simultaneously until measured.`;
    }
    if (q.includes("superposition")) {
      return `**Superposition** is the ability of a quantum particle to be in multiple states simultaneously. It is created using gates like the **Hadamard (H) gate**, which maps |0⟩ to (|0⟩ + |1⟩)/√2.`;
    }
    if (q.includes("entanglement")) {
      return `**Quantum Entanglement** is a strong link between qubits such that measuring the state of one instantly defines the state of the other, regardless of distance. This is typically created using a **CNOT (Controlled-NOT) gate**.`;
    }
  }

  // If research topic
  if (item.kind === "research") {
    if (q.includes("challenge") || q.includes("bottleneck") || q.includes("limitation")) {
      return `According to Section 4 of the Research Report, the main challenges for **${item.title.replace("Deep Research: ", "")}** include:
- **Resource Constraints**: Heavy computation demands and specialized chip sets.
- **Safety**: Creating predictable, explainable systems for boundary cases.
- **Interoperability**: Merging seamlessly with existing, legacy architectures.`;
    }
    if (q.includes("future") || q.includes("next")) {
      return `The future trends (Section 4) point toward a shift in the next five years regarding **low-power designs**, **specialized micro-models**, and shared open-source benchmarking standards.`;
    }
    if (q.includes("mechanism") || q.includes("architecture")) {
      return `Section 2 details the core mechanism which operates in three stages:
1. **Phase 1: Initial Intake & Mapping** (monitored by Structural Integrity)
2. **Phase 2: Transformational Analysis** (monitored by Convergence Speed)
3. **Phase 3: Final Synthesis** (monitored by Fidelity/Relevance Score)`;
    }
  }

  // Default smart extract answers based on keywords in custom texts
  if (item.kind === "text" || item.kind === "website") {
    const lines = item.content.split("\n");
    const matchingLines = lines.filter(line => line.toLowerCase().includes(q));
    if (matchingLines.length > 0) {
      return `I found references in the content matching your query:
      
${matchingLines.map(line => `> ${line}`).join("\n\n")}

Is there a specific point among these you'd like me to explain further?`;
    }
  }

  // Generic backup response
  return `Based on **${item.title}**, here is what I can tell you:
  
The document focuses on explaining related concepts. If you're preparing for an exam, I highly recommend checking out the **Tutor** tab to practice flashcards, or asking a more specific question like "Can you summarize this?" or "What are the main definitions?"`;
}

// Helper to generate dynamic premium study materials based on custom PDF upload file name
export function generateMockPdfContentForTopic(fileName: string): { title: string; content: string; flashcards: Flashcard[]; quiz: QuizQuestion[] } {
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  
  let topic = cleanName;
  let category = "Specialized Study Subject";
  let content = "";
  let flashcards: Flashcard[] = [];
  let quiz: QuizQuestion[] = [];
  
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes("intern") || lowerName.includes("career") || lowerName.includes("job") || lowerName.includes("web") || lowerName.includes("stack") || lowerName.includes("develop")) {
    category = "Full Stack Web Development & Career Prep";
    content = `Course Focus: Full Stack Web Development and Internship Strategy
Reference Document: ${fileName}

Unit 1: The Modern Full-Stack Architecture
- Frontend Systems: Modern interfaces are built using Component-Based Architectures (such as React or Vue.js). Styling is typically handled using Tailwind CSS or standard CSS modules. State management (e.g., Redux or Context API) coordinates data flows across the view tree.
- Backend Systems: Server engines process business logic. Node.js (with Express) provides highly asynchronous, event-driven request loops, while Python (FastAPI/Django) offers robust typing and fast API development.
- Database Layer: Structured relational databases (PostgreSQL) use tables and foreign keys for transactional integrity, whereas non-relational databases (MongoDB) store flexible JSON-like documents.

Unit 2: Active Recall & Internship Strategy
- Portfolio Strategy: When applying for modern developer positions, simple code clones are rejected by technical reviewers. Candidates must build 2-3 functional web projects deployed live (e.g., Vercel, Netlify, or AWS) with publicly visible, clean GitHub codebases.
- Resume & ATS Optimization: Resumes must be single-column and keyword-optimized for Applicant Tracking Systems. Avoid heavy formatting or graphics. Achievement bullet points should be metrics-driven (e.g., "Optimized database query latency by 30%").
- Networking & LinkedIn: A professional LinkedIn profile should have a clear, searchable headline. Connect with developers and technical recruiters directly in growth-stage startups to seek referrals.`;

    flashcards = [
      {
        question: "What is the key advantage of component-based architectures in modern frontends?",
        answer: "Component-based architectures (like React) allow developers to build reusable, modular user interface elements, simplifying maintenance and accelerating development timelines.",
        hint: "Think about reusability and modularity."
      },
      {
        question: "Why should developers deploy their projects live with a visible GitHub link?",
        answer: "Live deployments prove that the code actually works in production, and public GitHub codebases allow technical reviewers to inspect code structure, style, and programming habits.",
        hint: "It proves operational competence and code quality."
      },
      {
        question: "What resume format is recommended for modern ATS filters and why?",
        answer: "A simple, single-column resume format is recommended because ATS (Applicant Tracking Systems) can parse the text structure sequentially without missing key sections or titles.",
        hint: "Think about text parser scanning behavior."
      },
      {
        question: "What is the difference between SQL and NoSQL databases?",
        answer: "SQL databases (like PostgreSQL) are relational, use structured schemas, and are ideal for transaction-heavy apps. NoSQL databases (like MongoDB) are non-relational, flexible, and store JSON documents.",
        hint: "Relational vs flexible document structures."
      },
      {
        question: "How should achievements be described on a developer's resume?",
        answer: "Achievements should be described using active, metrics-driven bullet points that highlight specific impact, e.g., 'Optimized database query speed by 30%' instead of generic tasks.",
        hint: "Action-oriented and quantitative measurements."
      }
    ];

    quiz = [
      {
        question: "Which database type uses flexible document-like structures instead of rigid tables and keys?",
        options: ["PostgreSQL", "MongoDB", "MySQL", "Oracle DB"],
        answer: 1,
        explanation: "MongoDB is a NoSQL document database that stores records as flexible JSON-like documents rather than predefined tables."
      },
      {
        question: "What makes a resume ATS-friendly for technical roles?",
        options: [
          "Double-column layouts with charts and colorful graphics",
          "A clean, single-column format utilizing clear text and industry keywords",
          "Including full transcripts of all online courses completed",
          "Using custom cursive fonts for all titles and headers"
        ],
        answer: 1,
        explanation: "Applicant Tracking Systems parse single-column text templates with clear, standardized headers much more reliably."
      },
      {
        question: "Which of the following is recommended for a high-quality portfolio project?",
        options: [
          "An exact, copy-pasted tutorial clone of a popular app",
          "A fully functional, live-deployed application with clean, public source code",
          "A simple landing page with no interactive logic",
          "A list of theoretical concepts without actual implementation"
        ],
        answer: 1,
        explanation: "Live, functional applications showing high code quality and direct problem-solving are valued much more by recruiters than standard tutorial clones."
      }
    ];
  } else {
    content = `Course Focus: Specialized Analysis of ${topic}
Reference Document: ${fileName}

Unit 1: Foundational Framework of ${topic}
- Introduction: The study of ${topic} represents a crucial domain in modern engineering, research, and application development. Understanding its core components enables scalable architectures and mitigates common integration failures.
- Core Pillars:
  1. Input Processing: Standardizing data formats and structures to maintain high analytical fidelity.
  2. Logic Engine: The processing algorithms that parse constraints, resolve contradictions, and execute decisions.
  3. Output Delivery: Rendering high-quality, actionable results tailored to specific stakeholders.

Unit 2: System Constraints & Analysis
- Technical Limitations: Operating scales introduce latency, computational overhead, and network sync challenges.
- Optimization Strategy: Mitigate latency through edge caching, localized computation pools, and micro-model deployment.
- Verification Framework: Continuous testing cycles to measure semantic alignment, data integrity, and throughput stability.`;

    flashcards = [
      {
        question: `What represents the main objective of studying '${topic}'?`,
        answer: `The primary objective is to build a robust, scalable system that standardizes input structures, executes logic rules deterministically, and delivers high-fidelity results.`,
        hint: `Look at the Unit 1 introduction.`
      },
      {
        question: "How can operational latency be optimized in modern setups?",
        answer: "Latency is optimized through edge caching, localized computation pools, and deploying highly specialized micro-models.",
        hint: "Refer to Unit 2 Optimization Strategy."
      },
      {
        question: "What are the three core pillars of this system?",
        answer: "The three pillars are: Input Processing, the central Logic Engine, and customized Output Delivery.",
        hint: "See Unit 1 Core Pillars."
      }
    ];

    quiz = [
      {
        question: `Which component is responsible for executing business rules and resolving algorithmic constraints in '${topic}'?`,
        options: ["Input Processing Block", "Central Logic Engine", "Output Delivery System", "Edge Caching Pool"],
        answer: 1,
        explanation: "The Central Logic Engine compiles the rules, handles constraints, and executes the core processing logic."
      },
      {
        question: "What is a recommended method to optimize throughput and scale in edge architectures?",
        options: [
          "Increasing central server processing bottlenecks",
          "Utilizing localized computation pools and caching",
          "Restricting data access permissions globally",
          "Reverting to non-compiled script execution"
        ],
        answer: 1,
        explanation: "Edge processing leverages localized computation and caching to significantly reduce latency and backend bottleneck loads."
      }
    ];
  }

  return { title: cleanName, content, flashcards, quiz };
}

