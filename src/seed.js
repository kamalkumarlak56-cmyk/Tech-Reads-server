const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");

dotenv.config();

const products = [
  {
    title: "Applied AI Systems",
    category: "Book",
    technology: "Artificial Intelligence",
    author: "Nora Patel",
    price: 799,
    stock: 12,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80",
    description: "A practical guide to building AI products, evaluation loops, and responsible machine learning workflows."
  },
  {
    title: "Cloud Native Architecture Notes",
    category: "Article",
    technology: "Cloud",
    author: "Team TechReads",
    price: 149,
    stock: 50,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80",
    description: "Concise architecture patterns for containers, serverless systems, observability, and platform teams."
  },
  {
    title: "The Modern Developer Weekly",
    category: "Newspaper",
    technology: "Web Development",
    author: "Editorial Desk",
    price: 99,
    stock: 100,
    image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80",
    description: "A weekly technology newspaper covering frameworks, security, startups, and developer tooling."
  },
  {
    title: "Modern Cybersecurity Playbook",
    category: "Book",
    technology: "Cybersecurity",
    author: "Riya Sharma",
    price: 899,
    stock: 9,
    image: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=900&q=80",
    description: "Threat modeling, secure architecture, incident response, and practical defensive engineering for teams."
  },
  {
    title: "Full Stack React Patterns",
    category: "Book",
    technology: "Web Development",
    author: "Dev Malhotra",
    price: 699,
    stock: 18,
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
    description: "Production-ready React patterns, API integration, authentication, state management, and deployment workflows."
  },
  {
    title: "Distributed Systems Field Guide",
    category: "Book",
    technology: "Cloud",
    author: "Arjun Mehta",
    price: 999,
    stock: 14,
    rating: 5,
    reviewCount: 6,
    purchasedCount: 312,
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
    description: "A practical guide to resilient services, distributed data, queues, consistency, and production reliability."
  },
  {
    title: "Practical Data Engineering",
    category: "Book",
    technology: "Data Engineering",
    author: "Maya Iyer",
    price: 949,
    stock: 11,
    rating: 4.9,
    reviewCount: 6,
    purchasedCount: 284,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
    description: "Build dependable data pipelines with modeling, orchestration, quality checks, streaming, and observability."
  },
  {
    title: "Web Accessibility Handbook",
    category: "Book",
    technology: "Web Development",
    author: "Nisha Rao",
    price: 749,
    stock: 20,
    rating: 4.8,
    reviewCount: 4,
    purchasedCount: 196,
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80",
    description: "Design and build inclusive web experiences with accessible content, components, testing, and performance."
  }
];

const seed = async () => {
  await connectDB();

  let admin = await User.findOne({ email: "admin@techreads.com" });

  if (!admin) {
    admin = await User.create({
      name: "TechReads Admin",
      email: "admin@techreads.com",
      password: "Admin@123",
      role: "admin"
    });
  } else {
    admin.name = "TechReads Admin";
    admin.password = "Admin@123";
    admin.role = "admin";
    await admin.save();
  }

  await Product.deleteMany({});
  await Product.insertMany(products.map((product) => ({ ...product, createdBy: admin._id })));

  console.log("Seed complete");
  console.log("Admin email: admin@techreads.com");
  console.log("Admin password: Admin@123");
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
