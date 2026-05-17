// Entrypoint shim for tools expecting index.js
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`);
});
