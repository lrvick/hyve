module.exports = function(grunt) {

    grunt.initConfig({
        pkg: '<json:package.json>',
        concat: {
            dist: {
                src: ['src/<%= pkg.name %>.core.js','src/<%= pkg.name %>.*.js'],
                dest: 'dist/<%= pkg.name %>.js',
                separator: ';'
            }
        },
        min: {
            dist: {
                src: ['dist/<%= pkg.name %>.js'],
                dest: 'dist/<%= pkg.name %>.min.js',
            },
        },
    });

    grunt.registerTask('default', 'concat min');

}
