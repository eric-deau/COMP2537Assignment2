const mongoose = require('mongoose');
const app = require('./app');
const dotenv = require('dotenv');
dotenv.config({});


main().catch(err => console.log(err));
async function main() {
    await mongoose.connect(`mongodb+srv://${process.env.ATLAS_DB_USER}:${process.env.ATLAS_DB_PASSWORD}@cluster0.tj0fwin.mongodb.net/comp2537w1`);
    app.listen(process.env.PORT || 3000, () => {
        console.log('Example app listening on port 3000!');
    });
}

