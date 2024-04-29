const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
let portNumber = 5000;

const app = express();

app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs");

require("dotenv").config({ path: path.resolve(__dirname, 'env/.env') })
const username = process.env.MONGO_DB_username;
const password = process.env.MONGO_DB_PASSWORD;
const DB = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${username}:${password}@cluster0.8s90j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseAndCollection = { db: DB, collection: collection };
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.use(bodyParser.urlencoded({ extended: false }));
process.stdin.setEncoding("utf8");

app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write("Type stop to shutdown the server: ");

process.stdin.on('readable', () => {
    let input = process.stdin.read();
    if (input !== null) {
        input = input.trim();
        if (input === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${input}`);
        }
    }
    process.stdout.write("Type stop to shut down the server:");
    process.stdin.resume();
});

app.get("/", (request, response) => {
    response.render("index");
});

app.get("/reviewCharacters", (request, response) => {
    async function main() {
        try {
            await client.connect();
            const characters = await client.db(databaseAndCollection.db)
                .collection(databaseAndCollection.collection)
                .find({})
                .toArray();
            let table = "<table border = '1'>";
            table += "<tr><th>Name</th><th>Gender</th><th>Age</th><th>Anime</th><tr>"
            characters.forEach((character) => {
                table += `<tr><td>${character.name}</td><td>${character.gender}</td><td>${character.age}</td><td>${character.anime}</td></tr>`;
            });
            table += "</table>";
            response.render("reviewCharacters", { table: table });
        } catch (e) {
            console.error(e);
        }
    }
    main().catch(console.error);
});

app.get("/addCharacter", (request, response) => {
    response.render("addCharacter");
});

app.get("/searchCharacter", (request, response) => {
    response.render("searchCharacter");
});

app.get("/removeCharacter", (request, response) => {
    response.render("removeCharacter");
});

app.post("/processAddCharacter", (request, response) => {
    let { name, gender, age, anime } = request.body;
    age = Number(age);



    async function main() {
        try {
            await client.connect();
            const existingCharacter = await client.db(databaseAndCollection.db)
                .collection(databaseAndCollection.collection)
                .findOne({ name: name });

            if (existingCharacter) {
                return response.status(404).render("error", { message: "Character with this name already exists!" });
            }
            const character = { name: name, gender: gender, age: age, anime: anime };
            await insertCharacter(client, databaseAndCollection, character);

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
            const variables = {
                name: name,
                gender: gender,
                age: age,
                anime: anime,
            };
            response.render("processAddCharacter", variables);
        }
    }
    main().catch(console.error);


});

app.post("/processSearchCharacter", (request, response) => {
    const requestedName = request.body.name;

    async function main() {
        try {
            await client.connect();
            let result = await lookUpCharacter(client, databaseAndCollection, requestedName);
            if (!result) {
                return response.status(404).render("error", { message: "This character does not exist!" });
            }

            const variables = {
                name: result.name,
                gender: result.gender,
                age: result.age,
                anime: result.anime,
            };

            return response.render("processSearchCharacter", variables);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});


app.post("/processRemoveCharacter", (request, response) => {
    const characterToRemove = request.body.name;

    async function main() {
        try {
            await client.connect();
            const existingCharacter = await lookUpCharacter(client, databaseAndCollection, characterToRemove);

            if (!existingCharacter) {
                return response.status(404).render("error", { message: "This character does not exist!" });
            }

            await client.db(databaseAndCollection.db)
                .collection(databaseAndCollection.collection)
                .deleteOne({ name: characterToRemove });
            const quote = await api();


            response.render("processRemoveCharacter", { removed: characterToRemove, quote: quote });
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});

async function insertCharacter(client, databaseAndCollection, newApplicant) {
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApplicant);
}
async function lookUpCharacter(client, databaseAndCollection, requestedName) {
    let filter = { name: { $eq: requestedName } };
    const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .findOne(filter);
    return result;
}

//api
const url = 'https://quotes15.p.rapidapi.com/quotes/random/';
const options = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': '85ec754268msh5221cf7ab5b7d8ep1d7b58jsna611c3dd36ff',
        'X-RapidAPI-Host': 'quotes15.p.rapidapi.com'
    }
};

async function api() {
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        console.log(result);
        return `"${result.content}" -- ${result.originator.name}`;
    } catch (error) {
        console.error(error);
    }
}
