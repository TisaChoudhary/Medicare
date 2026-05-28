const express = require('express');
const router = express.Router();
const {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all medicine routes

router.route('/')
  .post(createMedicine)
  .get(getMedicines);

router.route('/:id')
  .get(getMedicineById)
  .put(updateMedicine)
  .delete(deleteMedicine);

module.exports = router;
