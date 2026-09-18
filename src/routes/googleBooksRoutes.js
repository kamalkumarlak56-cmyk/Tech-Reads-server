const express = require("express");
const asyncHandler = require("express-async-handler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
      res.status(400);
      throw new Error("Search query is required");
    }

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`
    );

    if (!response.ok) {
      res.status(response.status);
      throw new Error("Google Books request failed");
    }

    const data = await response.json();
    const books = (data.items || []).map((item) => ({
      googleBookId: item.id,
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.join(", "),
      description: item.volumeInfo.description,
      image: item.volumeInfo.imageLinks?.thumbnail,
      technology: q
    }));

    res.json(books);
  })
);

module.exports = router;
