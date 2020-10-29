const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check_auth');

const OrdersController = require('../controllers/orders');

router.get('/', checkAuth, OrdersController.orders_get_all);

router.post('/', checkAuth, OrdersController.orders_create_order);

router.get('/:orderId', checkAuth, OrdersController.orders_get_order);

router.get('/quantity/:quantity1/:quantity2', checkAuth, OrdersController.orders_get_order_by_quantity);

router.delete('/:orderId', checkAuth, OrdersController.orders_delete_order);

module.exports = router;