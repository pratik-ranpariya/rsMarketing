var express = require('express'),
  ejs = require('ejs'),
  path = require('path'),
  bodyParser = require('body-parser'),
//  url = 'mongodb://localhost:27017/oneDay'
  url = 'mongodb://admin:admin123@3.109.6.15:53584/rsmarketing'
//  dbName = 'oneDay'
  dbName = 'rsmarketing'
  MongoClient = require('mongodb').MongoClient,
  objectId = require('mongodb').ObjectID,
  session = require('express-session'),
  assets = require('assert'),
  uniqid = require('randomatic'),
  app = express(),
  _date = require('moment'),
  port = '3005';

  //status = 0 => pending, 1 => success, 2 => cancle

var BaseUrl = "http://localhost:" + port;
  // var BaseUrl = "http://3.109.6.15:" + port;

app.engine('html', ejs.renderFile);
app.set('view engine', 'ejs');

app.use(express.static('views'));
app.use(express.static(path.join(__dirname, 'views')));


app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

var server = app.listen(port, () => {
  console.log("We Are Live On " + port)
})

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', "*");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.use(session({
  secret: 'fsd84h507JKNJ9hg8&jndas*(jnjzcz',
  resave: true,
  saveUninitialized: true
}));

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
  assets.equal(null, err);
  if (err) throw err;
  const db = client.db(dbName);
  console.log("mongodb is connected with database =", dbName)

  responseData = (file, data, res) => {
    data['BaseUrl'] = BaseUrl;
    res.render(file, data);
  }

  pagination = (collectionName, pagePath, res, req, data) => {
    var perPage = 10;
    var page = (typeof req.params.page != 'undefined') ? (req.params.page == 0) ? 1 : req.params.page || 1 : 1;
    var skip = (perPage * page) - perPage;
    var limit = "LIMIT " + skip + ", " + perPage;
    db.collection(collectionName).find({}).sort({ _id: -1 }).skip(skip).limit(perPage).toArray((err, alldata) => {
      db.collection(collectionName).countDocuments((err, userCount) => {
        for (var i = 0; i < alldata.length; i++) {
            alldata[i].date = _date(alldata[i].date).format('DD/MM/YYYY h:mm:ss a');
        }
        data = {
          ph_date: '',
          data: alldata,
          agentData: data.agentlist ? data.agentlist : '',
          // partylist: data.partylist ? data.partylist : ''
        }
        data['cNumber'] = (req.params.page * 10) - 9
        data['search'] = {};
        data['current'] = page;
        data['pages'] = Math.ceil(userCount / perPage);
        responseData(pagePath, data, res)
      })
    })
  }

  app.get('/', (req, res) => {
    responseData('adminPanel/index.html', {
      msg: '',
      msgs: '',
      error: true
    }, res);
  })

  app.post('/login', (req, res) => {
    sess = req.session;

    var data = req.body;
    var Mobile_no = data.Mobile_no;
    var password = data.password;

    if (Mobile_no && password) {
      db.collection('admin').findOne({ username: Mobile_no, password: password }, (err, result) => {

        if (err) {
          console.log(err);
        }

        else if (result) {

          sess.Mobile_no = req.body.Mobile_no;
          return res.redirect('/dashboard')

        } else {
          responseData('adminPanel/index.html', {
            msg: 'Mobile Number and password not metch',
            msgs: '',
            error: true
          }, res);
        }

      })
    } else {
      responseData('adminPanel/index.html', {
        msg: '',
        msgs: 'Please Enter Mobile Number And Password',
        error: true
      }, res);
    }
  })

  app.get('/deleteNote/:id', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('notes').deleteOne({_id: objectId(req.params.id)})
      return res.json({status: 200, msg:'success'})
    } else {
      res.redirect('/');
    }
  })

  app.get('/deleteAgent/:id', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('agent').deleteOne({ agentId: req.params.id })
      return res.json({ status: 200, msg: 'success' })
    } else {
      res.redirect('/');
    }
  })


  app.get('/deleteparty/:id', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('party').deleteOne({ partyId: req.params.id })
      return res.json({ status: 200, msg: 'success' })
    } else {
      res.redirect('/');
    }
  })

  app.get('/deletecollection/:id', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('task').deleteOne({ _id: objectId(req.params.id) })
      return res.json({ status: 200, msg: 'success' })
    } else {
      res.redirect('/');
    }
  })

  app.get('/getbeatparty/:id', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('party').find({ beat: req.params.id }).toArray((e, data) => {
        return res.json({ status: 200, data: data})
      })
    } else {
      res.redirect('/');
    }
  })


  app.get('/dashboard', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('agent').find({}).project({ agentId: 1, name: 1, _id: 0 }).toArray((err1, agentData) => {
        db.collection('party').find({}).project({ partyId: 1, name: 1, beat: 1, _id: 0 }).toArray((err1, partyData) => {
          var flags = [], beatList = [], l = partyData.length, i;
          for (i = 0; i < l; i++) {
            if (flags[partyData[i].beat]) continue;
            flags[partyData[i].beat] = true;
            beatList.push(partyData[i].beat);
          }
          var data = {
            data: agentData,
            party: partyData,
            beat: beatList
          }
          responseData('adminPanel/dashboard.html', data, res)
        })
        })
      // responseData('adminPanel/.html', { data: { error: false } }, res);
    } else {
      res.redirect('/');
    }
  })

  app.get('/addAgent', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      responseData('adminPanel/addAgent.html', { data: { error: false } }, res);
    } else {
      res.redirect('/');
    }
  })

  app.get('/agentlist/:page', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var collectionName = 'agent';
      var pagePath = 'adminPanel/agentlist.html';
      var data = {
        error: false
      }
      pagination(collectionName, pagePath, res, req, data)

    } else {
      res.redirect('/')
    }
  })

  app.get('/partylist/:page', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var collectionName = 'party';
      var pagePath = 'adminPanel/partylist.html';
      var data = {
        error: false
      }
      pagination(collectionName, pagePath, res, req, data)

    } else {
      res.redirect('/')
    }
  })


  app.get('/notelist/:page', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var collectionName = 'notes';
      var pagePath = 'adminPanel/notelist.html';
      db.collection('agent').find({}).toArray((err, agentlist) => {
        var data = {
          agentlist: agentlist,
          error: false
        }
      pagination(collectionName, pagePath, res, req, data)
  })
      

    } else {
      res.redirect('/')
    }
  })

  // app.get('/collectionlist/:page', (req, res) => {
  //   sess = req.session;

  //   if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

  //     var collectionName = 'task';
  //     var pagePath = 'adminPanel/tasklist.html';
  //     db.collection('task').find({}).toArray((err, partylist) => {
  //       // console.log(partylist)
  //       db.collection('agent').find().toArray((e, agentlist) => {
  //         var data = {
  //           partylist: partylist,
  //           agentlist: agentlist,
  //           error: false
  //         }
  //         pagination(collectionName, pagePath, res, req, data)
  //       })
  //     })
  //   } else {
  //     res.redirect('/')
  //   }
  // })

  app.get('/collectionlist/:page', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      // var collectionName = 'task';
      // var pagePath = 'adminPanel/tasklist.html';
      var c = `${new Date().getFullYear()}-${(new Date().getMonth()+1)}-${new Date().getDate()}`
    

    var wh = {};

        wh['$and'] = [{
          date: {
            $gte: new Date(c + ' 00:00:00')
          }
        }, {
          date: {
            $lte: new Date(c + ' 23:59:59')
          }
        }]

      db.collection('task').find(wh).toArray((err, partylist) => {
        db.collection('agent').find().toArray((e, agentlist) => {
          
          let cashcollected = 0
          for (var i = 0; i < partylist.length; i++) {
            if(partylist[i].paymentMenthod === 'cash'){
              cashcollected += 
              parseInt(partylist[i].amount) + 
            parseInt(partylist[i].amount2) +
            parseInt(partylist[i].amount3) +
            parseInt(partylist[i].amount4)
            }
            partylist[i].amount = 
            parseInt(partylist[i].amount) + 
            parseInt(partylist[i].amount2) +
            parseInt(partylist[i].amount3) +
            parseInt(partylist[i].amount4)

            partylist[i].date = _date(partylist[i].date).format('DD/MM/YYYY h:mm:ss a');
          }

          
          var data = {
            ph_date: '',
            data: partylist,
            agentData: agentlist ? agentlist : '',
            cashcollected: cashcollected
            // partylist: data.partylist ? data.partylist : ''
          }
          console.log(data);
          data['search'] = {};
          responseData('adminPanel/tasklist.html', data, res)
          // pagination(collectionName, pagePath, res, req, data)
        })
      })
    } else {
      res.redirect('/')
    }
  })


  // app.post('/collectionlist/:page', (req, res) => {
  //   sess = req.session;
  //   var perPage = 10;
  //   var page = (typeof req.params.page != 'undefined') ? (req.params.page == 0) ? 1 : req.params.page || 1 : 1;
  //   var skip = (perPage * page) - perPage;
  //   var limit = "LIMIT " + skip + ", " + perPage;

  //   if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

  //     var collectionName = 'task';
  //     var pagePath = 'adminPanel/tasklist.html';
  //     wh = {}
  //     if(req.body.agentId){
  //       wh['agentId'] = req.body.agentId
  //     }
  //     console.log(wh);
  //     db.collection('task').find(wh).toArray((err, partylist) => {
  //       // console.log(partylist)
  //       db.collection('agent').find().toArray((e, agentlist) => {
  //         // var data = {
  //         //   partylist: partylist,
  //         //   agentlist: agentlist,
  //         //   error: false
  //         // }

  //         var data = {
  //           ph_date: '',
  //           data: partylist,
  //           agentData: data.agentlist ? data.agentlist : '',
  //           // partylist: data.partylist ? data.partylist : ''
  //         }

  //         console.log(data);
  //         // data['search'] = req.body;
  //         // data['current'] = page;
  //         // data['pages'] = Math.ceil(userCount / perPage);
  //         pagination(collectionName, pagePath, res, req, data)
  //       })
  //     })
  //   } else {
  //     res.redirect('/')
  //   }
  // })

  app.post('/collectionlist/:page', (req, res) => {
    sess = req.session;
    var perPage = 10;
    var page = (typeof req.params.page != 'undefined') ? (req.params.page == 0) ? 1 : req.params.page || 1 : 1;
    var skip = (perPage * page) - perPage;
    var limit = "LIMIT " + skip + ", " + perPage;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      var c = `${new Date().getFullYear()}-${(new Date().getMonth()+1)}-${new Date().getDate()}`
      wh = {}
      if(req.body.agentId){
        wh['agentId'] = req.body.agentId
      }
      
      wh['$and'] = [{
        date: {
          $gte: new Date(c + ' 00:00:00')
        }
      }, {
        date: {
          $lte: new Date(c + ' 23:59:59')
        }
      }]

      db.collection('task').find(wh).toArray((err, partylist) => {
        db.collection('agent').find().toArray((e, agentlist) => {
          let cashcollected = 0
          for (var i = 0; i < partylist.length; i++) {
            if(partylist[i].paymentMenthod === 'cash'){
              cashcollected += parseInt(partylist[i].amount) + 
              parseInt(partylist[i].amount2) +
              parseInt(partylist[i].amount3) +
              parseInt(partylist[i].amount4)
            }
            partylist[i].date = _date(partylist[i].date).format('DD/MM/YYYY h:mm:ss a');
          }
          var data = {
            ph_date: '',
            data: partylist,
            agentData: agentlist ? agentlist : '',
            cashcollected: cashcollected
            // partylist: data.partylist ? data.partylist : ''
          }
          data['search'] = req.body;
          data['current'] = page;
          data['pages'] = Math.ceil(partylist.length / perPage);
          responseData('adminPanel/tasklist.html', data, res);
        })
      })
    }
    else {
      res.redirect('/');
    }
  })

  app.post('/partylist/:page', (req, res) => {
    sess = req.session;
    var perPage = 10;
    var page = (typeof req.params.page != 'undefined') ? (req.params.page == 0) ? 1 : req.params.page || 1 : 1;
    var skip = (perPage * page) - perPage;
    var limit = "LIMIT " + skip + ", " + perPage;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var wh = {};
      if (req.body.mobile) {
        wh['mobile'] = (req.body.mobile).replace(/\s/g, '')
      }

      if (req.body.name) {
        wh['name'] = { '$regex': req.body.name, $options: 'i' }
      }

      // if (req.body.todate != '' && req.body.fromdate != '') {
      //   wh['$and'] = [{
      //     date: {
      //       $gte: new Date(req.body.todate + ' 00:00:00')
      //     }
      //   }, {
      //     date: {
      //       $lte: new Date(req.body.fromdate + ' 23:59:59')
      //     }
      //   }]
      // }

      db.collection('party').countDocuments(wh, (err, userCount) => {
        db.collection('party').find(wh).skip(skip).limit(perPage).toArray((err, users) => {
          
          for (var i = 0; i < users.length; i++) {
            if (users[i].date) {
              users[i].date = _date(users[i].date).format('DD/MM/YYYY h:mm:ss a');
            }
          }

          var data = {
            data: users,
            error: false
          }
          data['search'] = req.body;
          data['current'] = page;
          data['pages'] = Math.ceil(userCount / perPage);
          responseData('adminPanel/partylist.html', data, res);
        })
      })
    }
    else {
      res.redirect('/');
    }
  })

  app.post('/agentlist/:page', (req, res) => {
    sess = req.session;
    var perPage = 10;
    var page = (typeof req.params.page != 'undefined') ? (req.params.page == 0) ? 1 : req.params.page || 1 : 1;
    var skip = (perPage * page) - perPage;
    var limit = "LIMIT " + skip + ", " + perPage;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var wh = {};
      if (req.body.mobile) {
        wh['mobile'] = (req.body.mobile).replace(/\s/g, '');
      }

      if (req.body.todate != '' && req.body.fromdate != '') {
        wh['$and'] = [{
          date: {
            $gte: new Date(req.body.todate + ' 00:00:00')
          }
        }, {
          date: {
            $lte: new Date(req.body.fromdate + ' 23:59:59')
          }
        }]
      }

      db.collection('agent').countDocuments(wh, (err, userCount) => {
        db.collection('agent').find(wh).skip(skip).limit(perPage).toArray((err, users) => {
          for (var i = 0; i < users.length; i++) {
            if (users[i].date) {
              users[i].date = _date(users[i].date).format('DD/MM/YYYY h:mm:ss a');
            }
          }

          var data = {
            data: users,
            error: false
          }
          data['search'] = req.body;
          data['current'] = page;
          data['pages'] = Math.ceil(userCount / perPage);
          responseData('adminPanel/agentlist.html', data, res);
        })
      })
    }
    else {
      res.redirect('/');
    }
  })

  app.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
      console.log(err);
      res.redirect('/');
    })
  })

  app.post('/insertpin', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var data = req.body;

        var insertmy = {
          agentId: uniqid('0', 10),
          name: data.name,
          mobile: data.mobile,
          password: data.password,
          date: new Date()
        }

        db.collection('agent').insertOne(insertmy, (err1, visibility) => {

          res.redirect('/dashboard')
        })

    } else {

      res.redirect('/')

    }
  })


  app.post('/addpartyaccount', async (req, res) => {
    try {
      sess = req.session;
      if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
        var data = req.body;

        var insertmy = {
          partyId: uniqid('0', 10),
          name: data.name,
          mobile: data.mobile,
          beat: data.beat,
          contactperson: data.contactperson,
          date: new Date()
        }

        const saved = await db.collection('party').insertOne(insertmy)
        res.redirect('/dashboard')
      } else {
        res.redirect('/')
      }
    } catch (e) {
      res.redirect('/')
    }

  })

  app.post('/insertparty', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      var data = req.body;
      db.collection('party').findOne({ partyId: req.body.partyId }, (e, partyData) => {
        var insertmy = {
          agentId: data.agentId,
          partyId: data.partyId,
          name: partyData.name,
          contact: partyData.mobile,
          amount: data.amount ? parseInt(data.amount) : 0,
          amount2: data.amount2 ? parseInt(data.amount2) : 0,
          amount3: data.amount3 ? parseInt(data.amount3) : 0,
          amount4: data.amount4 ? parseInt(data.amount4) : 0,
          remark: data.remark,
          beat: data.beat,
          paymentMenthod: '',
          notes: '',
          status: 0,
          createdBy: 'admin',
          date: new Date()
        }

        db.collection('task').insertOne(insertmy, (err1, visibility) => {
          res.redirect('/dashboard')
        })
      })
    } else {
      res.redirect('/')
    }
  })

  app.post('/reuseparty', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      var data = req.body;
      db.collection('task').findOne({_id: objectId(data._id)}, (e, reuseData) => {
        // console.log(reuseData)
        var insertmy = {
          agentId: data.agentId,
          name: reuseData.name,
          address: reuseData.address,
          contact: reuseData.contact,
          amount: parseInt(data.amount),
          remark: reuseData.remark,
          paymentMenthod: reuseData.paymentMenthod,
          notes: reuseData.notes,
          status: 0,
          createdBy: 'admin',
          date: new Date()
        }

        db.collection('task').insertOne(insertmy, (err1, visibility) => {
          res.redirect('/partylist/1')
        })
      })

    } else {
      res.redirect('/')
    }
  })

  app.get('/addParty', (req, res) => {

    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('agent').find({}).project({ agentId: 1, name: 1, _id: 0 }).toArray((err1, agentData) => {
      db.collection('party').find({}).project({ partyId: 1, name: 1, _id: 0 }).toArray((err1, partyData) => {
        var data = {
          data: agentData,
          party: partyData
        }
        responseData('adminPanel/addParty.html', data, res)
      })
      })
    } else {
      res.redirect('/');
    }
  })
  

    app.get('/agentDetails/:id', (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('agent').findOne({agentId: req.params.id}, (err1, agentDetail) => {
        db.collection('task').find({agentId: req.params.id, status: 1}).project({_id: 0, amount: 1}).toArray((err, yetData) => {
          db.collection('task').find({agentId: req.params.id}).sort({_id: -1}).toArray((err, agentData) => {
          for (var i = 0; i < agentData.length; i++) {
              agentData[i].date = _date(agentData[i].date).format('DD/MM/YYYY h:mm:ss a');
          }

          agentDetail.date = _date(agentDetail.date).format('DD/MM/YYYY h:mm:ss a');
          var allCollection = 0;
          for(let i = 0; i < yetData.length; i++){
            allCollection += yetData[i].amount
          }

          agentDetail.collectedAmount = allCollection;

          
          var data = {
            detail: agentData,
            data: agentDetail
          }
          // console.log(data)
          responseData('adminPanel/agentdetail.html', data, res)
          })
        })
      })
    } else {
      res.redirect('/');
    }
  }) 

  app.get('/notes', (req, res) => {

    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      db.collection('agent').find({}).project({ agentId: 1, name: 1, _id: 0 }).toArray((err1, agentData) => {
        var data = {
          data: agentData
        }
        responseData('adminPanel/addnotes.html', data, res)
      })
    } else {
      res.redirect('/')
    }
  })

  app.post('/insertnotes', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      var data = req.body;
      if (data.agentId === 'all') {
        db.collection('agent').find().toArray((e, datas) => {
          datas.map((result, i) => {

            var insertmy = {
              note: data.note,
              agent: result.agentId,
              status: 0,
              date: new Date()
            }
            db.collection('notes').insertOne(insertmy)
            if(i+1 === datas.length){
              res.redirect('/dashboard')
            }
          })
        })

      } else {
        var insertmy = {
          note: data.note,
          agent: data.agentId,
          status: 0,
          date: new Date()
        }

        db.collection('notes').insertOne(insertmy, (err1, visibility) => {
          res.redirect('/dashboard')
        })
      }
    } else {
      res.redirect('/')
    }
  })


    app.get('/deletetask/:agentId/:taskid', (req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {

      db.collection('task').deleteOne({_id: objectId(req.params.taskid)}, (err, data) => {
        if(!err){
          res.redirect('/agentDetails/'+req.params.agentId)
        } else {
          res.redirect('/')
        }
      })

    } else {
      res.redirect('/')
    }
  })

  /* app.get('/financials', async(req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      try {
        const aggrigation = [
          {
            $lookup:
            {
              from: 'agent',
              localField: 'agentId',
              foreignField: 'agentId',
              as: 'agentData'
            }
          },
          {
            $unwind: '$agentData'
          },
          {
          $project: {
            day: { $dayOfMonth: '$date'},
            month: { $month: '$date' },
            year: { $year: '$date' },
            agentname: '$agentData.name',
            status: 1,
            agentId: 1,
            partyId: 1,
            name: 1,
            address: 1,
            contact: 1,
            amount: 1,
            remark: 1,
            paymentMenthod: 1,
            notes: 1,
            status: 1,
            createdBy: 1,
            date: 1
          }
        },
        {
          $match: {
            day: new Date().getDate(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            status: 1,
          }
        },
        {
          $project: {
            status: 1,
            agentId: 1,
            agentname: 1,
            name: 1,
            address: 1,
            contact: 1,
            amount: 1,
            remark: 1,
            partyId: 1,
            paymentMenthod: 1,
            notes: 1,
            status: 1,
            createdBy: 1,
            date: 1
          }
        },
        {
          $sort: { _id: -1 }
        }]

        var todayData = { date: {
          $gte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' 00:00:00'),
          $lte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() +' 23:59:59')
        }}
  
        const thisMonth = await db.collection('task').aggregate(aggrigation).toArray()
        const todayreceipt = await db.collection('receipt').find(todayData).toArray()
        const todaypayment = await db.collection('payment').find(todayData).toArray()

        var receiptData = thisMonth.concat(todayreceipt)
        receiptData.sort(function(a,b){
          return new Date(b.date) - new Date(a.date);
        });


        
        // return res.json(thisMonth)

      //   for (var i = 0; i < thisMonth.length; i++) {
      //     thisMonth[i].date = _date(thisMonth[i].date).format('DD/MM/YYYY h:mm:ss a');
      // }

      var ptotal = 0
        for (let i = 0; i < todaypayment.length; i++) {
          const element = todaypayment[i];
          ptotal += element.amount
        }

        var total = 0
        for (let i = 0; i < receiptData.length; i++) {
          const element = receiptData[i];
          total += element.amount
        }
        responseData('adminPanel/financials.html', { data: receiptData, total: total, payment: todaypayment, ptotal: ptotal}, res)
      } catch (e) {
        console.log(e);
        return res.json({ status: 200, msg: 'something going wrong', data: [] })
      }
    } else {
      res.redirect('/')
    }
  })
 */

  app.get('/financials', async(req, res) => {
    sess = req.session;

    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      try {
        const aggrigation = [
          {
            $lookup:
            {
              from: 'agent',
              localField: 'agentId',
              foreignField: 'agentId',
              as: 'agentData'
            }
          },
          {
            $unwind: '$agentData'
          },
          {
          $project: {
            day: { $dayOfMonth: '$date'},
            month: { $month: '$date' },
            year: { $year: '$date' },
            agentname: '$agentData.name',
            status: 1,
            agentId: 1,
            partyId: 1,
            name: 1,
            address: 1,
            contact: 1,
            amount: 1,
            amount2 : 1,
            amount3: 1,
            amount4: 1,
            remark: 1,
            paymentMenthod: 1,
            notes: 1,
            status: 1,
            createdBy: 1,
            date: 1
          }
        },
        {
          $match: {
            day: new Date().getDate(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            status: 1,
          }
        },
        {
          $project: {
            status: 1,
            agentId: 1,
            agentname: 1,
            name: 1,
            address: 1,
            contact: 1,
            amount: 1,
            amount2 : 1,
            amount3: 1,
            amount4: 1,
            remark: 1,
            partyId: 1,
            paymentMenthod: 1,
            notes: 1,
            status: 1,
            createdBy: 1,
            date: 1
          }
        },
        {
          $sort: { _id: -1 }
        }]

        var todayData = { date: {
          $gte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' 00:00:00'),
          $lte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() +' 23:59:59')
        }}
  
        const thisMonth = await db.collection('task').aggregate(aggrigation).toArray()
        const todayreceipt = await db.collection('receipt').find(todayData).toArray()
        const todaypayment = await db.collection('payment').find(todayData).toArray()
        const openingBalance = await db.collection('obalance').find(todayData).toArray()

        var receiptData = thisMonth.concat(todayreceipt)
        receiptData.sort(function(a,b){
          return new Date(b.date) - new Date(a.date);
        });


        
        // return res.json(thisMonth)

      //   for (var i = 0; i < thisMonth.length; i++) {
      //     thisMonth[i].date = _date(thisMonth[i].date).format('DD/MM/YYYY h:mm:ss a');
      // }

      var ptotal = 0
        for (let i = 0; i < todaypayment.length; i++) {
          const element = todaypayment[i];

          ptotal += element.amount
        }
        


        var total = 0
        for (let i = 0; i < todayreceipt.length; i++) {
          const element = todayreceipt[i];
          total += element.amount
        }

        var openingTotalBalance = 0
        for (let i = 0; i < openingBalance.length; i++) {
          const element = openingBalance[i];
          // total += element.amount
          openingTotalBalance += element.amount
        }

        for (let i = 0; i < thisMonth.length; i++) {
          const element = thisMonth[i];
          // element.amount = 0
          if(element.paymentMenthod === 'cash'){
            total += parseInt(element.amount) + 
            parseInt(element.amount2) +
            parseInt(element.amount3) +
            parseInt(element.amount4)
            console.log(total);
          }
          element.amount = parseInt(element.amount) + 
          parseInt(element.amount2) +
          parseInt(element.amount3) +
          parseInt(element.amount4)
        }

        

        return responseData('adminPanel/financials.html', { 
          data: receiptData, 
          total: total, 
          payment: todaypayment, 
          ptotal: ptotal, 
          obalance: openingBalance,
          openingTotalBalance: openingTotalBalance
        }, res)

      } catch (e) {
        console.log(e);
        return res.json({ status: 200, msg: 'something going wrong', data: [] })
      }
    } else {
      res.redirect('/')
    }
  })

  app.post("/obalance", async (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      try {
        req.body.date = new Date()
        req.body.amount = parseInt(req.body.amount)
        await db.collection('obalance').insertOne(req.body)
        return res.redirect('/financials')
      } catch (e) {
        res.redirect('/')
      }
    }
  })

  app.post('/addreceipt',async (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      try {
        req.body.date = new Date()
        req.body.amount = parseInt(req.body.amount)
        await db.collection('receipt').insertOne(req.body)
        return res.redirect('/financials')
      } catch (e) {
        res.redirect('/')
      }
    }
  })

  app.post('/addpayment',async (req, res) => {
    sess = req.session;
    if (sess.Mobile_no != undefined || sess.Mobile_no != null) {
      try {
        req.body.date = new Date()
        req.body.amount = parseInt(req.body.amount)
        await db.collection('payment').insertOne(req.body)
        return res.redirect('/financials')
      } catch (e) {
        res.redirect('/')
      }
    }
  })
  // =======================================API============================================

  app.post('/history', (req, res) => {
    if(req.body.agentId){
      
      db.collection('task').find({agentId: req.body.agentId, status: 1, date: {
        $gte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' 00:00:00'),
        $lte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() +' 23:59:59')
      }}).sort({_id: -1}).toArray((err, data) => {
        if(!err){
          return res.json({
            status: 200,
            msg: '',
            data: data
          })
        } else {
          return res.json({
            status: 500,
            msg: 'internal server error',
            data: []
          })
        }
      })
    } else {
      return res.json({
        status: 200,
        msg: 'fillup all detail',
        data: []
      })
    }
  })


  app.post('/newTask', (req, res) => {
    if(req.body.agentId){
      db.collection('task').find({agentId: req.body.agentId, status: 0}).sort({_id: -1}).toArray((err, data) => {
        if(!err){
          return res.json({
            status: 200,
            msg: '',
            data: data
          })
        } else {
          return res.json({
            status: 500,
            msg: 'internal server error',
            data: []
          })
        }
      })
    } else {
      return res.json({
        status: 200,
        msg: 'fillup all detail',
        data: []
      })
    }
  })

  // app.post('/dashboard', (req, res) => {
  //   if(req.body.agentId){

  //     var wh = {};
  //     var month = new Date().getMonth()+1;

  //     wh['$and'] = [{
  //       date: {
  //         $gte: new Date(new Date().getFullYear() + '-' + month  + '-' + new Date().getDate() + ' 00:00:00')
  //       }
  //     }, {
  //       date: {
  //         $lte: new Date()
  //       }
  //     },{
  //       status: 1
  //     }]

  //     wh.agentId = req.body.agentId

  //     db.collection('task').find(wh).project({_id: 0, amount: 1}).toArray((err, todayData) => {
  //       db.collection('task').find({status: 1}).project({_id: 0, amount: 1}).toArray((err, yetData) => {
  //         db.collection('agent').findOne({agentId: req.body.agentId},(err, agentData) => {
  //           console.log(agentData);

          
  //         var todayCollection = 0, 
  //             allCollection = 0;
  //         for(let i = 0; i < todayData.length; i++){
  //           todayCollection += todayData[i].amount
  //         }
  //         for(let i = 0; i < yetData.length; i++){
  //           allCollection += yetData[i].amount
  //         }

  //         agentData.todayCollection = todayCollection;
  //         agentData.allCollection = allCollection

  //         delete agentData.password;
  //         delete agentData._id;
  //         delete agentData.mobile;
  //         delete agentData.date;
  //         return res.json({
  //           status: 200,
  //           msg: '',
  //           data: agentData
  //         })
  //       })
  //       })
  //     })
  //   } else {
  //     return res.json({
  //       status: 200,
  //       msg: 'fillup all detail',
  //       data: {}
  //     })
  //   }
  // })

  app.post('/dashboard', (req, res) => {
    if(req.body.agentId){

      var wh = {};
      var month = (new Date().getMonth()+1);

     /* wh['$and'] = [{
        date: {
          $gte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth()+1) + '-' + new Date().getDate() + ' 00:00:00')
        }
      }, {
        date: {
          $lte: new Date()
        }
      }] */

      wh.date =  {
        $gte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' 00:00:00'),
        $lte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() +' 23:59:59')
      }
      wh.status = 1

      // var todayDatas =  {
      //   $gte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() + ' 00:00:00'),
      //   $lte: new Date(new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate() +' 23:59:59')
      // }
      wh['status'] = parseInt('1')
      wh.agentId = req.body.agentId

      db.collection('task').find(wh).project({_id: 0, amount: 1, paymentMenthod: 1}).toArray((err, todayData) => {
        // db.collection('task').find({agentId: req.body.agentId, status: 1, date: todayDatas}).project({_id: 0, amount: 1}).toArray((err, yetData) => {
          db.collection('agent').findOne({agentId: req.body.agentId},(err, agentData) => {
            console.log(todayData);

          
            agentData.todayCollections = 0
            agentData.otherCollection = 0
          for(let i = 0; i < todayData.length; i++){
            if(todayData[i].paymentMenthod == 'cash'){
              agentData.todayCollections += todayData[i].amount
            }
          }
          for(let i = 0; i < todayData.length; i++){
            if(todayData[i].paymentMenthod != 'cash'){
              agentData.otherCollection += todayData[i].amount
            }
          }

          delete agentData.password;
          delete agentData._id;
          delete agentData.mobile;
          delete agentData.date;
          return res.json({
            status: 200,
            msg: '',
            data: agentData
          })
        })
        // })
      })
    } else {
      return res.json({
        status: 200,
        msg: 'fillup all detail',
        data: {}
      })
    }
  })


  app.post('/updateparty', (req, res) => {

    if (req.body.agentId || req.body.taskid) {
      var body = req.body
      var wh = {}
      if (body.agentId) {
      //  wh['agentId'] = body.agentId
      }
      if (body.name) {
        wh['name'] = body.name
      }
      if (body.address) {
        wh['address'] = body.address
      }
      if (body.contact) {
        wh['contact'] = body.contact
      }
      if (body.amount) {
        wh['amount'] = parseInt(body.amount)
      }

      if (body.amount2) {
        wh['amount2'] = parseInt(body.amount2)
      }

      if (body.amount3) {
        wh['amount3'] = parseInt(body.amount3)
      }

      if (body.amount4) {
        wh['amount4'] = parseInt(body.amount4)
      }

      if (body.remark) {
        wh['remark'] = body.remark
      }
      if (body.paymentMenthod) {
        wh['paymentMenthod'] = body.paymentMenthod
        wh['status'] = 1
      }
      if (body.notes) {
        wh['notes'] = body.notes
      }

      db.collection('task').updateOne({ _id: objectId(req.body.taskid) }, { $set: wh }, (err1, visibility) => {
        return res.json({status: 200, data: {}})
      })
    } else {
      return res.json({
        status: 200,
        msg: 'fillup all detail',
        data: {}
      })
    }
  })

  app.post('/editpartyaccount', (req, res) => {

    if (req.body.partyId) {
      var body = req.body
      var wh = {}
      if (body.name) {
        wh['name'] = body.name
      }
      if (body.mobile) {
        wh['mobile'] = body.mobile
      }
      if (body.beat) {
        wh['beat'] = body.beat
      }
      if (body.contactperson) {
        wh['contactperson'] = body.contactperson
      }

      console.log(wh);

      db.collection('party').updateOne({ partyId: req.body.partyId }, { $set: wh }, (err1, visibility) => {
        return res.redirect('/partylist/1')
      })
    } else {
      return res.redirect('/')
    }
  })

  app.post('/insertagentparty', (req, res) => {
    var data = req.body;

    if (data.agentId) {

        var insertmy = {
          agentId: data.agentId,
          name: data.name,
          beat: data.beat,
          address: data.address,
          contact: data.contact,
          amount: data.amount ? parseInt(data.amount) : 0,
          amount2: data.amount2 ? parseInt(data.amount2) : 0,
          amount3: data.amount3 ? parseInt(data.amount3) : 0,
          amount4: data.amount4 ? parseInt(data.amount4) : 0,
          remark: data.remark ? data.remark : '',
          paymentMenthod: data.paymentMenthod ? data.paymentMenthod : '',
          notes: data.notes ? data.notes : '',
          status: 0,
          createdBy: 'agent',
          date: new Date()
        }

        db.collection('task').insertOne(insertmy, (err1, visibility) => {
         // res.redirect('/addParty')
         return res.json({status: 200, data: {}, msg: ''})
        })

    } else {
      return res.json({
        status: 200,
        msg: 'fillup all detail',
        data: {}
      })
    }
  })

  
  app.post('/agentlogin', (req, res) => {

    var data = req.body;
    var agentid = data.agentid;
    var mobile = data.mobile;
    var password = data.password;

    if (mobile && password && agentid) {
      db.collection('agent').findOne({ mobile: mobile, password: password, agentId: agentid }, (err, result) => {

        if (err) {
          console.log(err);
        }

        else if (result) {

          var wh = {};
          var month = new Date().getMonth() + 1;

          wh['$and'] = [{
            date: {
              $gte: new Date(new Date().getFullYear() + '-' + month + '-' + new Date().getDate() + ' 00:00:00')
            }
          }, {
            date: {
              $lte: new Date()
            }
          }, {
            status: 1
          }]

          wh.agentId = result.agentId

          // console.log(wh)

          db.collection('task').find(wh).project({ _id: 0, amount: 1 }).toArray((err, todayData) => {
            db.collection('task').find({agentId: req.body.agentId, status: 1 }).project({ _id: 0, amount: 1 }).toArray((err, yetData) => {
              db.collection('agent').findOne({ agentId: result.agentId }, (err, agentData) => {


                var todayollection = 0,
                  allCollection = 0;
                for (let i = 0; i < todayData.length; i++) {
                  todayollection += todayData[i].amount
                }
                for (let i = 0; i < yetData.length; i++) {
                  allCollection += yetData[i].amount
                }

                agentData.todayCollection = todayollection;
                agentData.allCollection = allCollection

                delete agentData.password;
                delete agentData._id;
                delete agentData.mobile;
                delete agentData.date;
                return res.json({
                  status: 200,
                  msg: '',
                  data: agentData
                })
              })
            })
          })

        } else {
          return res.json({ status: 500, msg: 'username and password incorrect', data: {} })
        }

      })
    } else {
      return res.json({ status: 500, msg: 'fillup all detail', data: {} })
    }
  })

    app.post('/agentnotes', (req, res) => {
    if(req.body.agentId){
      db.collection('notes').find({agent: req.body.agentId}).toArray((err, data) => {
        if(!err){
          return res.json({status: 200, msg: '', data: data})
        } else {
          return res.json({ status: 500, msg: 'something going wrong', data: [] })
        }
      })
    } else {
      return res.json({ status: 500, msg: 'fillup all detail', data: [] })
    }
  })

  app.get('/bill_generate/:agentId', async (req, res) => {

    try {
      const aggrigation = [{
        $project: {
          month: { $month: '$date' },
          year: { $year: '$date' },
          status: 1,
          agentId: 1,
          partyId: 1,
          name: 1,
          address: 1,
          contact: 1,
          amount: 1,
          remark: 1,
          paymentMenthod: 1,
          notes: 1,
          status: 1,
          createdBy: 1,
          date: 1
        }
      },
      {
        $match: {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          status: 1,
          agentId: req.params.agentId
        }
      },
      {
        $project: {
          status: 1,
          agentId: 1,
          name: 1,
          address: 1,
          contact: 1,
          amount: 1,
          remark: 1,
          partyId: 1,
          paymentMenthod: 1,
          notes: 1,
          status: 1,
          createdBy: 1,
          date: 1
        }
      },
      {
        $sort: { _id: -1 }
      }]

      const thisMonth = await db.collection('task').aggregate(aggrigation).toArray()
      return res.json({ status: 200, msg: '', data: thisMonth })
    } catch (error) {
      return res.json({ status: 200, msg: 'something going wrong', data: [] })
    }
  })

  app.get('/getpartylistdata', async (req, res) => {
    const partydata = await db.collection('party').find().sort({_id: -1}).toArray()
    return res.json(partydata)
  })

  app.get('/getagentlistdata', async (req, res) => {
    const agentdata = await db.collection('agent').find().sort({_id: -1}).toArray()
    return res.json(agentdata)
  })

  app.get('/makeItReadable', async (req, res) => {
    try {
      const { noteid } = req.query
      let wh = {}
      if (noteid) {
        wh['status'] = 1
      }
      db.collection('notes').updateOne({ _id: objectId(noteid) }, { $set: wh }, (err1, visibility) => {
        return res.json({status: 200, msg: '', data: 'data updated successfully'})
      })
    } catch (e) {
      console.log(e);
      return res.json({ status: 500, msg: 'something going wrong', data: '' })
    }
  })

  app.post('/downloadcollectiondata', async (req, res) => {
    var wh = {};
      if (req.body.agentId) {
        wh['agentId'] = req.body.agentId
      }
      if (req.body.partyId) {
        wh['partyId'] = req.body.partyId
      }
      if (req.body.from != '' && req.body.to != '') {
        wh['$and'] = [{
          date: {
            $gte: new Date(req.body.from + ' 00:00:00')
          }
        }, {
          date: {
            $lte: new Date(req.body.to + ' 23:59:59')
          }
        }]
      }

      const coldata = await db.collection('task').find(wh).sort({_id: -1}).toArray()
      return res.json(coldata)
  })

  app.get("/beatList", (req, res) => {
  db.collection("party")
    .find({})
    .project({ partyId: 1, name: 1, beat: 1, _id: 0 })
    .toArray((err1, partyData) => {
      var flags = [],
        beatList = [],
        l = partyData.length,
        i;
      for (i = 0; i < l; i++) {
        if (flags[partyData[i].beat]) continue;
        flags[partyData[i].beat] = true;
        beatList.push(partyData[i].beat);
      }
      return res.json({ status: 200, msg: "", data: beatList });
    });
});
})
