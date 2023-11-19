const router = require('express').Router();
const { register, login, forgotPassword, resetPassword, } = require('../controllers/auth.controllers');
const { restrict } = require('../middlewares/auth.middlewares');

module.exports = function (io) {
router.get('/register', (req, res) => {
    res.render('register');
})
router.post('/register', register);

router.post('/login', login);

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password');
})
router.post('/forgot-password', forgotPassword)

router.get('/reset-password', (req, res) => {
    let { token } = req.query;
    res.render('reset-password', { token });
});
router.post('/reset-password', resetPassword.bind(null, io));

router.get('/dashboard', restrict, async (req, res) => {
    try {
      const notifications = await prisma.notifications.findMany({
        where: {
          userId: req.user.id,
        }
      });
      res.render('dashboard', { ...req.user, notifications });
    } catch (error) {
      next(error);
    }
  });
};