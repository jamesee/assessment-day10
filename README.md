
# This repository contains the submission for Server-Side-Foundation end-of-course assessment.

## **Code Documentation**

initial end-point :
http://localhost:3000/

# Requirement 1

This requirement is fulfilled by the following end-point:
*http://localhost:3000/api/search*
```
GET /api/search
 parameters :
     selectionType : Title -> "T" , Author-> "A", Both-> "AT"
     keyword : search keyword(s), multiple keywords need to urlencode
     limit   : number of records (default 10)
     offset  : offset (defautl 0)
     orderBy : sort by (T or A) (default T)
     ascent     : true / false (default true)
```

# Requirement 2

point 1, 2, and 3 are fulfilled by the following:
*http://localhost:3000/api/book*
```
GET /api/book/:bookId 
return a json with all the details of id = bookId
```

point 4(a) and 4(b) are fulfilled by 
*http://localhost:3000/api/search*

point 4(c) is fulfilled by the following:
*http://localhost:3000/api/book/save*
```
POST /api/book/save
 parameters:

{
    "title" : "Harry Potter",
    "author_firstname": "James",
    "author_lastname":"Ee",
    "id":33
}
```

