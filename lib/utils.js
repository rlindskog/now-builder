const path = require('path')
const execa = require('execa')
const glob = require('@now/build-utils/fs/glob')
const consola = require('consola')

async function exec(cmd, args, { env, ...opts } = {}) {
  args = args.filter(Boolean)

  consola.log('Running', cmd, ...args)

  await execa(cmd, args, {
    stdout: process.stdout,
    stderr: process.stderr,
    env: {
      MINIMAL: 1,
      NODE_OPTIONS: '--max_old_space_size=3000',
      ...env
    },
    ...opts
  })
}

// function filterFiles(files, filterFn) {
//   const newFiles = {}
//   for (const fileName in files) {
//     if (filterFn(files)) {
//       newFiles[fileName] = files[fileName]
//     }
//   }
//   return newFiles
// }

function renameFiles(files, renameFn) {
  const newFiles = {}
  for (const fileName in files) {
    newFiles[renameFn(fileName)] = files[fileName]
  }
  return newFiles
}

async function globAndRename(pattern, opts, renameFn) {
  const files = await glob(pattern, opts)
  return renameFiles(files, renameFn)
}

function globAndPrefix(pattern, opts, prefix) {
  return globAndRename(pattern, opts, name => path.join(prefix, name))
}

function findNuxtDep(pkg) {
  for (const section of ['dependencies', 'devDependencies']) {
    for (const suffix of ['-edge', '']) {
      const name = 'nuxt' + suffix
      const version = pkg[section][name]
      if (version) {
        const semver = version.replace(/^[\^~><=]{1,2}/, '')
        return {
          name,
          version,
          semver,
          suffix,
          section
        }
      }
    }
  }
}

function preparePkgForProd(pkg) {
  // Ensure fields exist
  if (!pkg.dependencies) {
    pkg.dependencies = {}
  }
  if (!pkg.devDependencies) {
    pkg.devDependencies = {}
  }

  // Find nuxt dependency
  const nuxtDependency = findNuxtDep(pkg)
  if (!nuxtDependency) {
    throw new Error('No nuxt dependency found in package.json')
  }

  // Remove nuxt form dependencies
  for (const distro of ['nuxt', 'nuxt-start']) {
    for (const suffix of ['-edge', '']) {
      delete pkg.dependencies[distro + suffix]
    }
  }

  // Delete all devDependencies
  delete pkg.devDependencies

  // Add @nuxt/core to dependencies
  pkg.dependencies['@nuxt/core' + nuxtDependency.suffix] = nuxtDependency.version

  // Return nuxtDependency
  return nuxtDependency
}

let _step, _stepStartTime

const dash = ' ----------------- '

function startStep(step) {
  endStep()
  consola.log(dash + step + dash)
  _step = step
  _stepStartTime = process.hrtime()
}

function hrToMs(hr) {
  const hrTime = process.hrtime(hr)
  return ((hrTime[0] * 1e9) + hrTime[1]) / 1e6
}

function endStep() {
  if (!_step) {
    return
  }
  consola.info(`${_step} took: ${hrToMs(_stepStartTime)} ms`)
  _step = undefined
  _stepStartTime = undefined
}

// https://github.com/zeit/now-builders/blob/master/packages/now-next/src/utils.ts#L151
function pathIsInside(firstPath, secondPath) {
  return !path.relative(firstPath, secondPath).startsWith('..')
}

function getPathsInside(entryDir, files) {
  const watch = []

  for (const file of Object.keys(files)) {
    // If the file is outside of the entrypoint directory, we do
    // not want to monitor it for changes.
    if (!pathIsInside(entryDir, file)) {
      continue;
    }

    watch.push(file)
  }

  return watch
}

// // https://github.com/zeit/now-builders/blob/master/packages/now-next/src/utils.ts#L171
// function getRoutes(
//   entryDir,
//   pathsInside,
//   files,
//   url
// ) {
//   const filesInside = {}
//   const prefix = entryDir === `.` ? `/` : `/${entryDir}/`

//   for (const file of Object.keys(files)) {
//     if (!pathsInside.includes(file)) {
//       continue
//     }

//     filesInside[file] = files[file]
//   }

//   const routes = [
//     {
//       src: `${prefix}_nuxt/(.*)`,
//       dest: `${url}/_nuxt/$1`,
//     },
//     {
//       src: `${prefix}static/(.*)`,
//       dest: `${url}/static/$1`,
//     },
//   ]
//   const filePaths = Object.keys(filesInside)

//   for (const file of filePaths) {
//     const relativePath = path.relative(entryDir, file)
//     const isPage = pathIsInside('pages', relativePath)

//     if (!isPage) {
//       continue
//     }

//     const relativeToPages = path.relative('pages', relativePath)
//     const extension = path.extname(relativeToPages)
//     const pageName = relativeToPages.replace(extension, '')

//     if (pageName.startsWith('_')) {
//       continue
//     }

//     routes.push({
//       src: `${prefix}${pageName}`,
//       dest: `${url}/${pageName}`,
//     })

//     if (pageName.endsWith('index')) {
//       const resolvedIndex = pageName.replace('/index', '').replace('index', '')

//       routes.push({
//         src: `${prefix}${resolvedIndex}`,
//         dest: `${url}/${resolvedIndex}`,
//       })
//     }
//   }

//   // Add public folder routes
//   for (const file of filePaths) {
//     const relativePath = path.relative(entryDir, file)
//     const isPublic = pathIsInside('public', relativePath)

//     if (!isPublic) continue

//     const fileName = path.relative('public', relativePath)
//     const route = {
//       src: `${prefix}${fileName}`,
//       dest: `${url}/${fileName}`,
//     }

//     // Only add the route if a page is not already using it
//     if (!routes.some(r => r.src === route.src)) {
//       routes.push(route)
//     }
//   }

//   return routes
// }

module.exports = {
  exec,
  // filterFiles,
  renameFiles,
  glob,
  globAndRename,
  globAndPrefix,
  preparePkgForProd,
  startStep,
  findNuxtDep,
  endStep,
  getPathsInside,
  // getRoutes
}
