const express = require("express");
const router = express.Router();
const multer = require("multer");
const checkAuth = require("../middleware/check_auth");
const ProductsController = require("../controllers/products");
const path = require("path");
const crypto = require("crypto");
const gridFsStorage = require("multer-gridfs-storage");
const gridFsStream = require("gridfs-stream");
const mongoose = require("mongoose");
const Product = require("../models/product");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./uploads/");
//   },
//   filename: function (req, file, cb) {
//     cb(null, new Date().toISOString().replace(/:|\./g, "") + file.originalname);
//   }
// });

const uri =
  "mongodb+srv://quocpham:" +
  process.env.MONGO_ATLAS_PW +
  "@cluster0-bwhqi.gcp.mongodb.net/test?retryWrites=true&w=majority";

mongoose.connection.once("open", () => {
  console.log("MongoDB Connected");
});

var filename;

var storage = new gridFsStorage({
  url: uri,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "products"
        };
        resolve(fileInfo);
      });
    });
  }
});

const fileFilter = (req, file, cb) => {
  //reject a file
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  //   limits: {
  //     fieldSize: 1024 * 1024 * 5
  //   },
  fileFilter: fileFilter
});

router.get("/", ProductsController.products_get_all);

// router.post("/", checkAuth, upload.single("productImage"), ProductsController.products_create_product);
router.post("/", checkAuth, upload.single("productImage"), (req, res, next) => {
  const product = new Product({
    _id: new mongoose.Types.ObjectId(),
    name: req.body.name,
    price: req.body.price,
    productImage: filename
  });
  product
    .save()
    .then((result) => {
      console.log(result);
      res.status(201).json({
        message: "Created product successfuly",
        createdProduct: {
          name: result.name,
          price: result.price,
          productImage: result.productImage,
          _id: result._id,
          request: {
            type: "GET",
            url: "https://nodejsmongo2019.herokuapp.com/products/" + result._id
          }
        }
      });
    })
    .catch((err) => console.log(err));
});

router.get("/files", (req, res) => {
  var gridfsbucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "products"
  });
  gridfsbucket.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist"
      });
    }
    return res.json({ files });
  });
});

router.get("/image/:filename", (req, res, next) => {
  // old version
  // this code use GridStore
  // gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
  //   if (!file || file.length === 0) {
  //     return res.status(404).json({
  //       err: "No files exist"
  //     });
  //   } else {
  //     if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
  //       const readStream = gfs.createReadStream(file.filename);
  //       readStream.pipe(res);
  //     } else {
  //       return res.status(404).json({
  //         err: "Not an image"
  //       });
  //     }
  //   }
  // });

  //this code use GridFSBucket to replace GridStore
  let filename = req.params.filename;

  var gridfsbucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "products"
  });
  const readStream = gridfsbucket.openDownloadStreamByName(filename).on("error", (error) => {
    console.log("Some error occurred in download: " + error);
    res.send(error);
  });
  readStream.pipe(res);
});

router.get("/:productId", ProductsController.products_get_product);

router.patch("/:productId", checkAuth, ProductsController.products_update_product);

router.delete("/:productId", checkAuth, ProductsController.products_delete_product);

module.exports = router;
