#!/usr/bin/env node
var fs= require('fs'),
  path = require('path'),
  Repo = require('git').Repo,
  async = require('async'),
  program = require('commander'),
  colors = require('colors'),
  fse =require("fs-extra"),
  npm = require('npm'),
  _ = require('lodash')


program
  .version('0.0.1')
  .usage('zero command line')
  .command("save [modules]")
  .option("-m --msg [msg]","msg to comment")
  .option("-p --path <modulePath>","module path")
  .action(function( specifiedModules, options ){
    specifiedModules = specifiedModules ? specifiedModules.split(",") : modules
    var msg = options.msg || "auto save"

    async.forEachSeries(specifiedModules,function( module, nextModule){
      fs.exists(path.join(options.modulePath,module,".git"), function(exist){
        if( !exist){
          return console.log(err, module)
        }
        gitCommitAndPush( path.join(options.modulePath,module), msg, nextModule)
      })
    })
  })

program.command("status <modulePath>")
  .action(function( modulePath, options){
    var absoluteModulePath = path.join(process.cwd(),modulePath)
    async.forEachSeries(modules,function( module, nextModule){
      console.log( ("\n"+module).green)
      fs.exists(path.join(absoluteModulePath,module,".git"), function(exist){
        if( !exist){
          return console.log(err, module)
        }
        checkStatus( path.join(absoluteModulePath,module), nextModule)
      })
    })
  })

program.command('publish [modules]')
  .option("-p --path <modulePath>","module path")
  .action(function( specifiedModules, options ){
    specifiedModules = specifiedModules ? specifiedModules.split(",") : modules
    console.log("begin to publish")

    npm.load({}, function (err) {

      if( err) return console.log( err )

      async.forEachSeries(specifiedModules,function( module, nextModule){
        fs.exists(path.join(options.modulePath,module), function(exist){
          if( !exist){
            nextModule()
            return console.log(err, module)
          }
          npmPublish( path.join(options.modulePath,module), nextModule)
        })
      })
    })
  })

program.command('release <modulePath>')
  .option("-m --msg [msg]","msg to comment")
  .action(function(modulePath,options){
    var absoluteModulePath = path.join(process.cwd(),modulePath)

    var packageInfo = fse.readJsonSync( path.join(absoluteModulePath,"package.json"))
    packageInfo.version = increaseVersion( packageInfo.version )
    fse.outputJsonSync( path.join(absoluteModulePath,"package.json"), packageInfo)

    gitCommitAndPush( absoluteModulePath,options.msg+", and auto release "+packageInfo.version, function( err){
      if( err ){
        return console.log( err)
      }

      npm.load({}, function (err) {
        npmPublish( absoluteModulePath, function(err){
          if(err) return console.log( err)
          console.log("release",module,"success")
        })
      })
    })
  })

program.command("checkout")
  .option("-p --path <modulePath>","module path")
  .action(function(options){
    async.forEachSeries(modules,function( module, nextModule){
      console.log( ("\n"+module).green)
      fs.exists(path.join(options.modulePath,module,".git"), function(exist){
        if( !exist){
          return console.log(err, module)
        }
        checkout( path.join(options.modulePath,module), nextModule)
      })
    })
  })

function increaseVersion( version ){
    var versionTmp = version.split("."),
      versionLast = (parseInt(versionTmp.pop()) + 1).toString()

    return versionTmp.concat( versionLast).join(".")
}

function npmPublish( modulePath, done ){
  var module = modulePath.split("/").pop()
  console.log(("\n"+module).green, modulePath)

  process.chdir(modulePath);
  npm.commands.publish([modulePath], function (err, data) {
    if (err) console.log(err )
    console.log(data)
    done(err)
  })
}


function checkStatus( modulePath, done){
  process.chdir(modulePath);

  new Repo(modulePath,function(err, repo){
    if( err ){
      return console.log(err)
    }
    repo.git.git('status',{},function(err, res) {
      if( err ) return console.log("add err",err)
      console.log("add finished",modulePath,res)
      done()
    })
  })
}

function checkout( modulePath, done){
  process.chdir(modulePath);

  new Repo(modulePath,function(err, repo){
    if( err ){
      return console.log(err)
    }
    repo.git.git('checkout',{},"HEAD","package.json",function(err, res) {
      if( err ) return console.log("add err",err)
      console.log("checkout finished",modulePath,res)
      done()
    })
  })
}


function gitCommitAndPush( modulePath,msg, done){
  console.log( ("\n"+modulePath).green)
  process.chdir(modulePath);

  new Repo(modulePath,function(err, repo){
    if( err ){
      console.log(err)
      return done(err)
    }
    repo.git.git('add',{},'--all',function(err, res) {
      if( err ) {
        console.log("add err",err)
        //skip
        return done(err)
      }
      console.log("add finished",modulePath,res)
      repo.git.git("commit",{},"-m",msg, function(err, res){
        if( err){
          console.log( modulePath, ("commit done " +res).green,err||"")
          return done(err)
        }
        console.log("commit finished",modulePath,res)
        repo.git.git("push",{},"origin","master",function(err, res){
          if( err ){
            console.log( "push error", modulePath)
            done( err )
          }
          console.log("push finished",modulePath,res)
          done()
        })
      })
    })
  })
}

program.parse(process.argv);
