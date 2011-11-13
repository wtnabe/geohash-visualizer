# -*- mode: ruby -*-

if RUBY_VERSION >= '1.9.2'
  desc 'start web server'
  task :web do
    sh 'ruby -run -e httpd -- --port=3000 .'
  end
end

namespace :git do
  desc 'git ls-files -o'
  task :untracked do
    sh 'git ls-files -o -X .gitignore'
  end
end
