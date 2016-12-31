'use strict';

const fs = require('fs');
const config = require('./config.json');
const Discord = require('discord.js');
const bot = new Discord.Client({ autoReconnect: true });
let stored;
let dmCache = [];

//Check to see if we have json file named botdata.json and load it. If not lets create an object
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

//Find all runs and reply in channel
function getRuns(message) {
    let allRuns = [];
    if (stored.runs.length > 0) {
        for (let i = 0; i < stored.runs.length; i++) {
            allRuns.push(`**${stored.runs[i].creator}** is looking to do **${stored.runs[i].dung}** on **${stored.runs[i].day}**.`);
            allRuns.push(`*Type "/joinrun ${stored.runs[i].creator}" to join this run or "/runinfo ${stored.runs[i].creator}" to see who's signed up!*`);
            if (i<stored.runs.length-1) {allRuns.push('')}
        }
        message.channel.sendMessage(allRuns);
    } else {
        message.channel.sendMessage('No runs available');
    }
}

function findRun(userInput, message){
    function finder(run) {
        return run.creator == userInput;
    }
    if (stored.runs.length > 0) {
        let getRun = stored.runs.find(finder);
        let replyData = []; //empty array to get our wanted data

        if (getRun) {
            for(let i = 0; i < getRun.group.length; i++) {
                console.log(i);
                replyData.push(`**${getRun.group[i][0]}** - **${getRun.group[i][1]}**`);
                if (i<getRun.length-1) {replyData.push('')}
            }
            message.channel.sendMessage(replyData);
        }
        else {
            message.channel.sendMessage('Group could not be found.');
        }
    }
}

//Write data to botdata.json file
function writeJson(data) {
    let json = JSON.stringify(data);
    fs.writeFile('botdata.json', json, function(error) {
        if (error) {
            console.error(error.message);
        } else {
            console.log("Data saved");
        }
    });
}

//Reload botdata.json and enter data from createRun process
function prepJSON(cacheData) {
        fs.readFile('./botdata.json', 'utf8', function readFileCallback(err, data){
            if (err){
                //Doesn't exist create it
                stored.runs.push({creator: cacheData.name, dung: cacheData.dung, day: cacheData.day, group: [[cacheData.name, cacheData.role]]});
                writeJson(stored);
            } else {
                //File exists
                stored = JSON.parse(data);
                stored.runs.push({creator: cacheData.name, dung: cacheData.dung, day: cacheData.day, group: [[cacheData.name, cacheData.role]]});
                writeJson(stored);
            }});

}

//Did the user already create a run?
function checkPending(name,arr) {
    let exists;
    for (let i=0;i < arr.length;i++){
        exists = arr[i].uid==name;
        if (exists) {
            return [true,i];
        }
    }
    return false;
}

//Create run process begins
function createRun(message) {
    let runDetails = {uid: message.author.id,step: 0};
    let pushCache = function() {
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
}

//Looking for help but no help to be found
function getHelp(msg,data) {
    let helpData = [];
    helpData.push('this');
    helpData.push('is');
    helpData.push("a test");
    msg.author.sendMessage(helpData);
}

//Run constructor
function runAssembler(msg,pos) {
    const stepper = {
        0:[() => 'What is your in game name?'],
        1:[() => 'What role are you? Accepted inputs: Tank/Healer/DPS','name'],
        2:[() => 'What dungeon are you looking to do? Example: DHT+3','role'],
        3:[() => 'What day do you want to do this? Example: Sun,Mon,Tues,Wed...etc','dung'],
        4:[() => {
            dmCache[pos].day = msg.content.split(' ')[0];
            return `You have the following. Name: **${dmCache[pos].name}**, Role: **${dmCache[pos].role}**, Dungeon: **${dmCache[pos].dung}**, Day: **${dmCache[pos].day}**.\nIf this is correct type save, otherwise this run will be deleted`;

        }],
        5:[() => {
            if (msg.content.split(' ')[0] == 'save') {
                prepJSON(dmCache[pos]);
                return 'Your run has been saved!';
            } else {
                return 'Your run was not saved and has been deleted';
            }
        }]
    };
    if (dmCache[pos]) {
        if (dmCache[pos].step > 0) {
            dmCache[pos][stepper[dmCache[pos].step][1]] = msg.content.split(' ')[0];
        }
        msg.author.sendMessage(stepper[dmCache[pos].step][0]());
        dmCache[pos].step<5?dmCache[pos].step += 1:dmCache.splice(pos, 1);
    }
}

//Did someone send a message?
bot.on('message', function(message) {
    if(message.author.username !== bot.user.username) {
        if (message.channel.type == 'dm' && dmCache.length>0) {
            const cacheInfo = checkPending(message.author.id,dmCache);
            if (cacheInfo[0] && message.content.split(' ')[0].charAt(0) !== '/') {
                runAssembler(message,cacheInfo[1]);
            }
        }
        const userInput = message.content.split(' ');
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
            case '/viewrun':
                findRun(userInput[1], message);
                break;
            default:
                break;
        }
    }
});

bot.login(config.botKey);
