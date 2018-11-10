//dependencies
const express = require('express');
const router = express.Router();

//require request and cheerio to scrape
const request = require('request');
const cheerio = require('cheerio');

//Require models
const Comment = require('../models/comment');
const Article = require('../models/article');

//index
router.get('/', (req, res) => {
    res.redirect('/articles');
});

// A GET request to scrape the next web website
router.get('/scrape', (req, res) => {
    // grab the body of the html with request
    request('https://thenextweb.com/dd/', (error, response, html) => {
        // load that into cheerio and save it to $ for a shorthand selector
        const $ = cheerio.load(html);
        const titlesArray = [];
        // grab every article
        $('div.story.story--large').each(function(i, element) {
            // Save an empty result object
            const result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children('div.story-text').children('h4.story-title').children('a').text().trim();
            result.link = $(this).children('div.story-text').children('h4.story-title').children('a').attr('href');

            //make sure there are no empty title or links are sent to mongodb
            if(result.title !== "" && result.link !== ""){
              //check for duplicates
              if(titlesArray.indexOf(result.title) == -1){

                // push the saved title to the array 
                titlesArray.push(result.title);

                // only add the article if is not already there
                Article.count({ title: result.title}, (err, test) => {
                    //if the test is 0, the entry is unique and good to save
                  if(test == 0){

                    //using Article model, create new object
                    const entry = new Article (result);

                    //save entry to mongodb
                    entry.save((err, doc) => {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log(doc);
                      }
                    });

                  }
            });
        }
        // Log that an article already exists
        else{
          console.log('Article already exists.');
        }

          }
          // Log that scrape is working, just the content was missing parts
          else{
            console.log('Not saved to DB, missing data');
          }
        });
        // after scrape, redirect to index
        res.redirect('/');
    });
});

//grab every article an populate the DOM
router.get('/articles', (req, res) => {
    //allows newer articles to be on top
    Article.find().sort({_id: -1})
        //send to handlebars
        .exec((err, doc) => {
            if(err){
                console.log(err);
            } else{
                const artcl = {article: doc};
                res.render('index', artcl);
            }
    });
});

//get the articles scraped from the mongoDB in JSON
router.get('/articles-json', (req, res) => {
    Article.find({}, (err, doc) => {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    });
});

//clear all articles 
router.get('/clearAll', (req, res) => {
    Article.remove({}, (err, doc) => {
        if (err) {
            console.log(err);
        } else {
            console.log('removed all articles');
        }

    });
    res.redirect('/articles-json');
});

router.get('/readArticle/:id', (req, res) => {
  const articleId = req.params.id;
  const hbsObj = {
    article: [],
    body: []
  };

     //find the article by the id
    Article.findOne({ _id: articleId })
      .populate('comment')
      .exec((err, doc) => {
      if(err){
        console.log(`Error: ${err}`);
      } else {
        hbsObj.article = doc;
        const link = doc.link;
        //grab article from link
        request(link, (error, response, html) => {
          const $ = cheerio.load(html);

          $('article.post').each(function(i, element){
            hbsObj.body = $(this).children('div.post-body.fb-quotable.u-m-3').children('p').text();
            //send article body and comments to article.handlbars through hbObj
            res.render('article', hbsObj);
            //prevent loop through so it doesn't return an empty hbsObj.body
            return false;
          });
        });
      }

    });
});

// Create a new comment
router.post('/comment/:id', (req, res) => {
  const user = req.body.name;
  const content = req.body.comment;
  const articleId = req.params.id;

  //submit form
  const commentObj = {
    name: user,
    body: content
  };
 
  //using the Comment model, create a new comment
  const newComment = new Comment(commentObj);

  newComment.save((err, doc) => {
      if (err) {
          console.log(err);
      } else {
          console.log(doc._id);
          console.log(articleId);
          Article.findOneAndUpdate({ "_id": req.params.id }, {$push: {'comment':doc._id}}, {new: true})
            //execute everything
            .exec((err, doc) => {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect(`/readArticle/${articleId}`);
                }
            });
        }
  });
});

module.exports = router;