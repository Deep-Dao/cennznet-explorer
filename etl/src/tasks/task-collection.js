const _ = require('lodash');

class TaskCollection {
    constructor(tasks) {
        this.tasks = tasks;
    }

    first() {
        return this.tasks[0];
    }

    last() {
        return this.tasks[this.tasks.length - 1];
    }

    length() {
        return this.tasks.length;
    }

    add(task) {
        this.tasks.push(task);
    }

    getData(key, uniqKey) {
        const data = this.tasks
            .map(task => task.get(key))
            .reduce((result, items) => result.concat(items), [])
            .filter(item => !!item);
        return uniqKey ? _.uniqBy(data, uniqKey) : data;
    }
}

module.exports = TaskCollection;
