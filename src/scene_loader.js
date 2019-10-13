import * as THREE from 'three'
import { AssimpLoader } from 'three/examples/jsm/loaders/AssimpLoader.js';
import { GCodeLoader } from 'three/examples/jsm/loaders/GCodeLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import solidworksLoader from './solidworks'

export default function (extraLoaders) {
  const loaders = {
    getExtension (src) {
      return src.split('.').pop().toLowerCase()
    },
    async load (src) {
      const extension = this.getExtension(src)
      let obj = this['3d'][extension]
      if (!obj) obj = this['2d'][extension]
      if (!obj) return null
      return obj(src)
    },
    availableLoaders () {
      return {
        '2d': Object.keys(this['2d']),
        '3d': Object.keys(this['3d'])
      }
    },
    '2d': {
      dxf (src) {
        return new Promise(async (resolve, reject) => {
          const { DXFLoader } = await import('./dxf-loader')
          const dxf = new DXFLoader()
          dxf.load(src,
            (model) => {
              resolve(model)
            }
          )
        })
      },
      svg (src) {
        const svg = new SVGLoader()
        return new Promise((resolve, reject) => {
          svg.load(src,
            (paths) => {
              const group = new THREE.Group()
              group.scale.multiplyScalar(0.25)
              group.position.x = -70
              group.position.y = 70
              group.scale.y *= -1
              for (let i = 0; i < paths.length; i++) {
                const path = paths[ i ]
                const material = new THREE.MeshBasicMaterial({
                  color: path.color,
                  side: THREE.DoubleSide,
                  depthWrite: false
                })
                const shapes = path.toShapes(true)
                for (let j = 0; j < shapes.length; j++) {
                  const shape = shapes[ j ]
                  const geometry = new THREE.ShapeBufferGeometry(shape)
                  const mesh = new THREE.Mesh(geometry, material)
                  group.add(mesh)
                }
              }
              resolve(group)
            }
          )
        })
      }
    },
    '3d': {
      '3ds': function (src) {
        const tds = new TDSLoader()
        return new Promise((resolve, reject) => {
          tds.load(src,
            (model) => {
              const material = new THREE.MeshNormalMaterial()
              model.traverse(function (child) {
                if (child.isMesh) child.material = material
              })
              resolve(model)
            },
            (prog) => prog,
            (err) => reject(err)
          )
        })
      },
      assimp (src) {
        const assimp = new AssimpLoader()
        return new Promise((resolve, reject) => {
          assimp.load(src,
            (model) => {
              resolve(model.object)
            },
            (prog) => prog,
            (err) => reject(err)
          )
        })
      },
      fbx (src) {
        return new Promise((resolve, reject) => {
          const { FBXLoader } = import('three-fbx-loader')
          const fbx = new FBXLoader()
          fbx.load(src,
            (model) => {
              resolve(model)
            },
            (prog) => prog,
            (err) => reject(err)
          )
        })
      },
      gcode (src) {
        const gcode = new GCodeLoader()
        return new Promise((resolve, reject) => {
          gcode.load(src,
            (model) => {
              resolve(model)
            },
            (prog) => prog,
            (err) => reject(err)
          )
        })
      },
      gltf (src) {
        const gltf = new GLTFLoader()
        return new Promise((resolve, reject) => {
          gltf.load(src,
            (model) => {
              resolve(model.scene)
            },
            (prog) => prog,
            (err) => reject(err)
          )
        })
      },
      obj (src) {
        const obj = new OBJLoader()
        return new Promise((resolve, reject) => {
          obj.load(src,
            (mesh) => {
              const material = new THREE.MeshNormalMaterial()
              mesh.traverse(function (child) {
                if (child.isMesh) child.material = material
              })
              resolve(mesh)
            }
          )
        })
      },
      stl (src) {
        const stl = new STLLoader()
        return new Promise((resolve, reject) => {
          stl.load(src,
            (geometry) => {
              const material = new THREE.MeshNormalMaterial()
              const mesh = new THREE.Mesh(geometry, material)
              const scene = new THREE.Scene()
              scene.add(mesh)
              resolve(scene)
            },
            (prog) => prog,
            (err) => reject(err)
          )
        })
      },
      'sldprt': solidworksLoader
    }
  }
  Object.assign(loaders['3d'], extraLoaders)
  return loaders
}
