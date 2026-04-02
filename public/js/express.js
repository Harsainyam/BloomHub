import express from "express";
const app = express();

app.set("view engine", "ejs");
app.set("views", "./views");  // make sure your login.ejs is inside /views

app.use(express.urlencoded({ extended: true }));

// GET login page
app.get("/login", (req, res) => {
  res.render("login", { error: null, showError: false });
});

// POST login form
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "user@example.com" && password === "password123") {
    res.send("✅ Login successful!");
  } else {
    res.render("login", { error: "❌ Invalid email or password", showError: true });
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000/login"));