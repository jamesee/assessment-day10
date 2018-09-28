require('dotenv').config()
const express =  require("express"),
      mysql = require("mysql"),
      cors = require('cors'),
      multer = require('multer'),  
      request = require('request'),
      path = require('path'),
      hbs = require('express-handlebars'),
      bodyParser = require("body-parser");


var app = express();
// app.use(cors());
const NODE_PORT = parseInt(process.env.PORT) || 3000;

const API_URI = "/api";

//configure handlebars
app.engine('hbs', hbs({ defaultLayout: 'main.hbs'}));
app.set('view engine', 'hbs');

console.log("DB USER : " + process.env.DB_USER);
console.log("DB NAME : " + process.env.DB_NAME);
console.log(__dirname);

var pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: process.env.DB_CONLIMIT,
    // debug: true
})
// ================= functions ================
var makeQuery = (sql, pool)=>{
    return  (args, args2)=>{
        let queryPromsie = new Promise((resolve, reject)=>{
            pool.getConnection((err, connection)=>{
                if(err){
                    reject(err);
                    return;
                }
                console.log('[INFO] makeQuery args:', args);
                console.log('[INFO] makeQuery args2:', args2);

                if(typeof(args2) !== 'undefined'){
                    sql = args2;
                }
                connection.query(sql, args || [], (err, results)=>{
                    connection.release();
                    if(err){
                        reject(err);
                        return;
                    }
                    resolve(results); 
                })
            });
        });
        return queryPromsie;
    }
}

// SQL Statements
const sqlFindAllBooks = "SELECT  * FROM books";
const sqlFindBook = "SELECT  * FROM books WHERE id = ?";
// mySQLQuery = default; to be replace by constructSQLQuery
const mySQLQuery = "SELECT * FROM books WHERE (title like '%white%' ) || (author_lastname like '%white%' ) || (author_firstname like '%white%' ) ORDER BY title, author_lastname, author_firstname ASC LIMIT 20 OFFSET 0";
const sqlSaveBook = "UPDATE books SET title = ?, author_firstname = ?, author_lastname = ? WHERE id = ?";

var findAllBooks = makeQuery(sqlFindAllBooks, pool);
var queryTitleAuthor = makeQuery(mySQLQuery, pool);
var findBook = makeQuery(sqlFindBook, pool);
var saveBook = makeQuery(sqlSaveBook, pool);

//routes -- for testing purpose [check all records in db]
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get(API_URI + "/all", (req, res)=>{
    findAllBooks().then((results)=>{
        res.json(results);
    }).catch((error)=>{
        console.log(error);
        res.status(500).json(error);
    });
});
// ==============================================================
// GET /api/book/:bookId 
// return one record
// ==============================================================
app.get(API_URI + "/book/:bookId", (req, resp) => {
    console.log('[DEBUG] /api/book bookId : ',req.params.bookId);
    findBook([req.params.bookId])
        .then((results) => {
            if (results.length == 0) {
                resp.status(400).json({error : 'Book not found!'}).end();
            } else{

                resp.status(200).type('text/html');
                resp.render('book', {
                    layout: "main.hbs",
                    bookDetails: results
                });
    
                // res.status(200).json(results[0]).end();
            }
        })
        .catch((error) => {
            resp.status(500).json({error: error}).end();
        });
});

// ==============================================================
// POST /api/book/save
// parameters:
/*
{
    "title" : "Harry Potter",
    "author_firstname": "James",
    "author_lastname":"Ee",
    "id":33
  }
*/
// ==============================================================//
app.post(API_URI + "/book/save",  (req, res) => {
    console.log('[DEBUG] /api/book/save req.body : ', req.body);


    findBook([req.body.id])
    .then((results) => {
        let title = (typeof(req.body.title) !== 'undefined')? req.body.title : results.title;
        let bookId = req.body.id;
        if (typeof(req.body.title) !== 'undefined') {
            author = req.body.author.split(" ");
            console.log('[DEBUG] author : ',author);
            author_firstname = author[0];
            author_lastname = author[1];

        } else {
            author_firstname = results.author_firstname;
            author_lastname = results.author_lastname;
        }
        console.log('[DEBUG] author_firstname : ',author_firstname);
        console.log('[DEBUG] author_lastname : ',author_lastname);

        saveBook([title, author_firstname, author_lastname, req.body.id])
        .then( (results) => {
                resp.status(200).type('text/html');
                resp.render('response', {
                layout: "main.hbs",
                bookDetails: results
                });
                // res.status(200).json({message : "successfully saved"});
        })
        .catch((error) => {
            res.status(500).json(error).end();
        });

    }).catch((error) => {
        res.status(500).json(error).end();
    });
    

});
// ==============================================================
// GET /api/search
// parameters :
//      selectionType : Title -> "T" , Author-> "A", Both-> "AT"
//      keyword : search keyword(s), multiple keywords need to urlencode
//      limit   : number of records (default 10)
//      offset  : offset (defautl 0)
//      orderBy : sort by (T or A) (default T)
//      ascent     : true / false (default true)
// ==============================================================
app.get(API_URI + "/search/", (req, resp)=>{
    console.log("[INFO] /search req.query : ", req.query);
    
    let selectionType = req.query.selectionType;
    let keyword = req.query.keyword;
    let orderBy = (req.query.orderBy == "A")? 'author_lastname, author_firstname' : 'title';
    let ascent = (req.query.ascent == "false")? 'DESC': 'ASC';
    let limit = (typeof(req.query.limit) === 'undefined') ? 10: parseInt(req.query.limit);
    let offset = (typeof(req.query.offset) === 'undefined') ? 0: parseInt(req.query.offset);
    
    let constructSQLQuery = 'SELECT * FROM books'

    if (typeof(selectionType) !== 'undefined')  {

        switch(selectionType) {
            case 'T':
                constructSQLQuery += ` WHERE (title like '%${keyword}%' )`;
                break;
            case 'A':
                constructSQLQuery += ` WHERE (author_lastname like '%${keyword}%' ) || (author_firstname like '%${keyword}%' )`;
                break;
            default: 
            //case 'AT'
                constructSQLQuery += ` WHERE  (title like '%${keyword}%' ) || (author_lastname like '%${keyword}%' ) || (author_firstname like '%${keyword}%' )`;
        }

        constructSQLQuery +=  ` ORDER BY ${orderBy} ${ascent} LIMIT ${limit} OFFSET ${offset}`;

        console.log('[DEBUG] constructSQLQuery : ', constructSQLQuery);

        queryTitleAuthor([], constructSQLQuery)
        .then((results)=>{

            resp.status(200).type('text/html');
            resp.render('form', {
                layout: "main.hbs",
                queryList: results,
                queryListLength: results.length
            });

            //for testing
            // resp.status(200).json(results);

        }).catch((error)=>{
            resp.status(500).json(error);
        });
    }else{
        resp.status(500).json({error : "Selection Type not found !"})
    }
})

//Load the form 
app.get('/form', (req, resp) => {
    resp.status(200).type('text/html');
    resp.render('book', { layout: "main.hbs" });
})

app.get('/', (req, resp) => {
    resp.status(200).type('text/html');
    resp.render('form', { layout: "main.hbs"});
});

app.use(express.static(path.join(__dirname, 'thumbnails')));

app.listen(NODE_PORT, ()=>{
    console.log(`Listening to server at ${NODE_PORT}`)
})
