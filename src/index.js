#!/usr/bin/env node
// https://medium.com/jspoint/making-cli-app-with-ease-using-commander-js-and-inquirer-js-f3bbd52977ac

const { Command } = require('commander');
const program = new Command();
const group = require('./create-group.js');
program.version('0.0.1');

// program
//   .option('-d, --debug', 'output extra debugging')
//   .option('-g, --group-type <type>', 'flavour of group')

program
    .command('group') // sub-command name
    .alias('o') // alternative sub-command is `o`
    .description('Create group') // command description

    // function to execute when command is uses
    .action(function () {
        group();
    });

program.parse(process.argv);

// const options = program.opts();
// if (options.debug) console.log(options);
// console.log('group details:');
// if (options.groupType) console.log(`- ${options.groupType}`);
