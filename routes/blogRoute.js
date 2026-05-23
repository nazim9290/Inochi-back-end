

const { requireAuth } = require("../middleware/auth")
const { checkAdmin } = require("../middleware/admin");
const express = require("express")
const indexnow = require("../helpers/indexnow");
const router = express.Router();

// EN: IndexNow ping for blog publish/update/delete — re-crawls the post URL
//     + the blog index across all locales. Fire-and-forget; never blocks.
// BN: blog publish/update/delete-এ IndexNow ping — post URL + blog index
//     সব locale-এ re-crawl করায়। Fire-and-forget; কখনো block করে না।
const blogPing = indexnow.pingIndexNow((req) => [`/blog/${req.params.id}`, '/blog']);
// controllers
const { createBlog, updateBlog, allPublishedBlog,
        deleteBlogById,
        allPendingBlog,
        singleBlog,
        singleBlogconvert,
        getCaruselDraft,
        deleteCaruselDraft,
        getCarusel,
        aprovedCarusel,
        singlgleBlogTags,
        allPublishedBlogBlogs,
        allPublishedBlogstudy,
        allPublishedBlogService,
        singleblogpublic,
        postBlogToFacebook,
        checkFacebookConnection,
        CreateCarusel } = require("../controllers/blogControlar");

router.post("/create-blog", requireAuth, createBlog);
router.put("/update-blog/:id", requireAuth, checkAdmin, blogPing, updateBlog);
router.post("/blog/:id/post-to-facebook", requireAuth, checkAdmin, postBlogToFacebook);
router.get("/facebook/check", requireAuth, checkAdmin, checkFacebookConnection);
router.get('/pending-blogs', requireAuth, checkAdmin, allPendingBlog);
router.get('/blog/:id', requireAuth, checkAdmin, blogPing, singleBlog);
router.delete('/blog/:id', requireAuth, checkAdmin, blogPing, deleteBlogById);
//
router.put('/approve-blog/:id', blogPing, singlgleBlogTags)
router.put('/publised-single-blog/:id', requireAuth, checkAdmin, singleBlogconvert);
// 
// 
router.post("/create-carusel",  CreateCarusel)
// public route :
router.get('/published-blogs', allPublishedBlog);
router.get("/draft-carusel", getCaruselDraft);
router.delete("/delete-carusel/:id", requireAuth, deleteCaruselDraft);
router.put("/aproved-carusel/:id", aprovedCarusel);

router.get("/published-carusels", getCarusel);
router.get("/blogs-published",allPublishedBlogBlogs);
router.get("/blogs-study",allPublishedBlogstudy)
router.get("/blogs-service",allPublishedBlogService)
router.get("/singleblogs/:id",singleblogpublic)

module.exports = router;