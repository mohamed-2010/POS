module.exports = {
    apps: [
        {
            name: 'pos-backend',
            script: 'dist/server.js',
            cwd: '/home/zimflo-pos-api/htdocs/pos.api.zimflo.com',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3800,
                WS_PORT: 3801,
            },
            // Logging
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            // Restart policy
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            min_uptime: '10s',
        },
    ],
};
