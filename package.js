Package.describe({
    "name": 'novus:nvd3',
    summary: 'Nvd3.org charts.',
    version: "1.7.1",
    git: "https://github.com/novus/nvd3"
});

Package.on_use(function (api) {
    api.versionsFrom("METEOR@1.0");
    api.use('d3js:d3', 'client');

    api.add_files('build/nv.d3.js', 'client');
    api.add_files('build/nv.d3.css', 'client');
});