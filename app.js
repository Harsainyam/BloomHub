app.get('/cart', (req, res) => {
  // Example cart data
  const cart = [
    { name: "Fiddle Leaf Fig", price: 799, quantity: 1, image: "/images/fiddleleavefig.jpg" },
    { name: "Aloe Vera", price: 499, quantity: 2, image: "/images/aloevera.jpg" }
  ];

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal + tax + shipping;

  res.render('cart', { cart, subtotal, tax, shipping, total });
});
