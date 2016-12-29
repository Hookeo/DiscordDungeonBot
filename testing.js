var fs = require('fs');
var config = require('./config.json');
var Discord = require('discord.js');
var bot = new Discord.Client({ autoReconnect: true });
var stored;
var dmCache = [];

fs.readFile('./botdata.json', 'utf8', function readFileCallback(err, data){
    if (err){
        stored = {
            runs: []
        };
        console.log('File didn\'t exist and will be created');
    } else {
        stored = JSON.parse(data);
        console.log('JSON file loaded');
    }});

var getRuns = function(message) {
    var allRuns = "";
    if (stored.runs.length > 0) {
        for (var i = 0; i < stored.runs.length; i++) {
            var formatting = '**'+stored.runs[i].creator+ '** is looking to do **'+stored.runs[i].dung+'** on **'+stored.runs[i].day+'**.\n*Type "/joinrun '
                +stored.runs[i].creator+' yournamehere" to join this run or "/runinfo '+stored.runs[i].creator+'" to see who\'s signed up!*';
            allRuns += i<stored.runs.length-1?formatting+'\n\n':formatting;
        }
        message.channel.sendMessage(allRuns);
    } else {
        message.channel.sendMessage('No runs available');
    }
};

var writeJson = function(data) {
    var json = JSON.stringify(data);
    fs.writeFile('botdata.json', json, function(error) {
        if (error) {
            console.error(error.message);
        } else {
            console.log("Data saved");
        }
    });
} ;

var checkPending = function(name,arr) {
    var exists;
    for (var i=0;i < arr.length;i++){
        exists = arr[i].uid==name;
        if (exists) {
            return [true,i];
        }
    }
    return false;
};

var createRun = function(message,msgData) {
    var runDetails = {uid: message.author.id,step: 0};
    var pushCache = function() {
        dmCache.push(runDetails);
        message.author.sendMessage("So you are looking to start a run, great!");
        runAssembler(message,checkPending(message.author.id,dmCache)[1])
    };
    if (dmCache.length>0) {
        if (checkPending(message.author.id,dmCache)[0]) {
            message.reply('You have already created a run.');
        } else {
            pushCache();
        }
    } else {
        pushCache();
    }
    /*
     if (msgData.length < 4) {
     message.channel.sendMessage('Error creating run. Expected format: /createrun "in game name" "dungeon" "day"\nExample: /createrun Audi DHT+3 Sat' );
     } else {
     fs.readFile('./botdata.json', 'utf8', function readFileCallback(err, data){
     if (err){
     //Doesn't exist create it
     stored.runs.push({creator: msgData[1], dung: msgData[2], day: msgData[3], group: [msgData[1]]});
     writeJson(stored);
     } else {
     //File exists
     stored = JSON.parse(data);
     stored.runs.push({creator: msgData[1], dung: msgData[2], day: msgData[3], group: [msgData[1]]});
     writeJson(stored);
     }});
     message.reply('Created run ' + msgData[2] + ' for '+msgData[3]);
     }
     */
};

var getHelp = function(msg,data) {
    var helpData = [];
    helpData.push('this');
    helpData.push('is');
    helpData.push("a test");
    msg.author.sendMessage(helpData);
};

var runAssembler = function(msg,pos) {
    var cacheWrapup = function(day) {
        if (dmCache[pos].step == 4) {
            dmCache[pos].day = day;
            return [
                "You have entered: Name- "+dmCache[pos].name+
                ", Role- "+dmCache[pos].role+
                ", Dungeon- "+dmCache[pos].dung+
                ", Day- "+dmCache[pos].day+
                ". If this is correct type save, otherwise this run will be deleted"
            ];
        }
    };
    var saveRun = function(save) {
        if (dmCache[pos].step == 5) {
            if (save=='save') {
                msg.author.sendMessage('Your run has been saved!');
            } else {
                msg.author.sendMessage('Your run was not saved and has been deleted')
            }
            dmCache.splice(pos, 1);
        }
    };
    var stepper = {
        0:['What is your in game name?'],
        1:['What role are you? Accepted inputs: Tank,Healer,DPS','name'],
        2:['What dungeon are you looking to do? Example: DHT+3','role'],
        3:['What day do you want to do this? Example: Sun,Mon,Tues,Wed...etc','dung'],
        4:[cacheWrapup(msg.content.split(' ')[0])],
        5:[saveRun(msg.content.split(' ')[0])]
    };
    if (dmCache[pos]) {
        if (dmCache[pos].step > 0) {
            dmCache[pos][stepper[dmCache[pos].step][1]] = msg.content.split(' ')[0];
        }
        msg.author.sendMessage(stepper[dmCache[pos].step][0]);
        dmCache[pos].step += 1;
    }

};

bot.on('message', function(message) {
    if(message.author.username !== bot.user.username) {
        if (message.channel.type == 'dm' && dmCache.length>0) {
            var cacheInfo = checkPending(message.author.id,dmCache);
            if (cacheInfo[0]) {
                runAssembler(message,cacheInfo[1]);
            }
        }
        var userInput = message.content.split(' ');
        switch (userInput[0]) {
            case '/getruns':
                getRuns(message);
                break;
            case '/startrun':
                createRun(message,userInput);
                break;
            case '/runhelp':
                getHelp(message,getHelp);
                break;
            default:
                break;
        }
    }
});

bot.login(config.botKey);
