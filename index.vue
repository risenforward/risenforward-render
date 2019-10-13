<template>
  <div class="webgl-renderer">
    <div
      v-if="supported"
      ref="size"
      class="renderer-frame"
      >
      <canvas
        ref="canvas"
        class="webgl-canvas"
        height="100%"/>
    </div>
      <div
        v-if="!supported"
        class="renderer-frame"
        >
        <p> File name: {{ src }} </p>
        <p> Width: {{ dimensions.width + unit }} </p>
        <p> Height: {{ dimensions.height + unit }} </p>
        <p> Depth: {{ dimensions.depth + unit }} </p>
        <p> Material: {{ material.name }} </p>
      </div>
  </div>
</template>

<script>
import * as THREE from 'three-full'
import GLSupported from '@mapbox/mapbox-gl-supported'
import LoaderFactory from './src/scene_loader'
import { addTextToGrid } from './src/helpers'
import disposeHierarchy from './src/cleanup'

const loaders = LoaderFactory()
const GRID_SIZE = 100
const NUM_STEPS = 10

export default {
  props: {
    src: {
      type: String,
      default: ''
    },
    rotation: {
      type: Object,
      default: () => { return { x: 0, y: 0, z: 0 } }
    },
    material: {
      type: Object,
      default: () => { return { name: '', src: '' } }
    },
    color: {
      type: Number,
      default: 0xffffff
    },
    modelHook: {
      type: Function,
      default: (model) => model
    },
    unit: {
      type: String,
      default: 'cm'
    },
    dimensions: {
      type: Object,
      default: () => {
        return {
          width: undefined,
          height: undefined,
          depth: undefined
        }
      }
    },
    additionalLoaders: {
      type: Object,
      default: () => {}
    }
  },
  data () {
    return {
      loaded: false,
      supported: true,
      emitUpdate: false,
      glSupported: GLSupported({
        failIfMajorPerformanceCaveat: true
      })
    }
  },
  watch: {
    rotation: {
      deep: true,
      handler () {
        this.emitUpdate = true
        this.eulerRotation.set(
          THREE._Math.degToRad(this.rotation.x),
          THREE._Math.degToRad(this.rotation.y),
          THREE._Math.degToRad(this.rotation.z)
        )
      }
    }
  },
  beforeDestroy () {
    disposeHierarchy(this.scene)
    // disposeHierarchy(this.meshes)
    // disposeHierarchy(this.camera)
    // disposeHierarchy(this.light)
    // disposeHierarchy(this.meshes)
    // disposeHierarchy(this.elements)
    this.orbit.dispose()
    this.renderer.dispose()
    // this.renderer.forceContextLoss()
    this.renderer = null
    this.labels = []
    if (this.currentFrame) {
      cancelAnimationFrame(this.currentFrame)
    }
    window.removeEventListener('resize', this.resize)
  },
  beforeCreate() {
    console.log(this)
    this.camera = new THREE.PerspectiveCamera(75,
      window.innerWidth / window.innerHeight, 0.1, 100000)
    this.scene = new THREE.Scene()
    this.light = new THREE.AmbientLight(0xdddddd)
    this.model = makeHalfCircle()
    this.meshes = []
    this.eulerRotation = new THREE.Euler(0, 0, 0)
    this.elements = {}
    this.position = {
      x: 0,
      y: 0,
      z: 0
    }
    this.size = new THREE.Vector3(
      100,
      100,
      100
    )
    this.offset = new THREE.Vector3(
      0,
      0,
      0
    )
    this.scale = {
      x: 1,
      y: 1,
      z: 1
    }
  },
  mounted () {
    this.$nextTick(this.setup)
  },
  methods: {
    setup () {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.$refs.canvas
      })
      this.scene.background = new THREE.Color(this.color)
      this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement)
      this.orbit.screenSpacePanning = true
      this.resize()
      this.scene.add(this.light)
      this.scene.add(this.model)
      this.camera.position.z = 10
      this.currentFrame = requestAnimationFrame(this.loadAnimation)
      window.addEventListener('resize', this.resize)
      loaders.load(this.src)
        .then((model) => {
          if (!model) {
            this.supported = false
            return
          }
          disposeHierarchy(this.scene)
          this.model.geometry.dispose()
          this.model = this.modelHook(model)
          this.elements.shadowModel = this.model.clone()
          this.elements.shadowModel.quaternion.set(0, 0, 0, 1)
          this.elements.shadowBox = new THREE.BoxHelper(
            this.elements.shadowModel, 0x000000
          )
          this.elements.group = new THREE.Group()
          this.elements.group.add(this.model)
          this.elements.box = new THREE.BoxHelper(this.elements.group, 0x000000)
          this.addGrids(GRID_SIZE, NUM_STEPS)
          this.camera.position.set(90, 50, 90)
          this.scene.add(this.elements.box)
          this.scene.add(this.elements.group)
          this.scene.traverse(this.collectMeshes)
          this.orbit.target = new THREE.Vector3(-50, -50, -50)
          this.orbit.update()
          this.elements.shadowModel.setRotationFromEuler(this.eulerRotation)
          this.elements.shadowBox.update()
          collectModelData(this.elements.shadowBox, this.size, this.offset)
          new THREE.TextureLoader().load(this.material.src, (texture) => {
            for (let mesh of this.meshes) {
              const material = new THREE.MeshLambertMaterial({
                map: texture
              })
              mesh.material = material
            }
          })
          this.loaded = true
          let dimensions = {
            width: 0,
            height: 0,
            depth: 0
          }
          if (!this.dimensions ||
            !this.dimensions.width ||
            !this.dimensions.height ||
            !this.dimensions.depth) {
            dimensions.width = this.size.x
            dimensions.height = this.size.y
            dimensions.depth = this.size.z
          } else {
            dimensions.width = this.dimensions.width
            dimensions.height = this.dimensions.height
            dimensions.depth = this.dimensions.depth
          }
          this.$emit('loaded', dimensions)
        })
        .catch((err) => console.log(err))
    },
    createLabels (gridInterval, numSteps, unit) {
      this.labels = []
      this.labels.length = numSteps
      for (let i = 0; i < numSteps + 1; ++i) {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 1024
        const context = canvas.getContext('2d')
        context.rotate(-Math.PI)
        const fontface = 'Arial'
        const fontsize = 75
        context.font = ' ' + fontsize.toString() + 'px ' + fontface
        context.translate(-canvas.width, -canvas.height)
        context.textBaseline = 'middle'
        context.textAlign = 'center'
        context.fillStyle = 'rgba(0,0,0)'
        this.labels[i] = canvas
      }
    },
    updateLabels (elements, labels, numSteps, dimensions, unit) {
      const gridInterval =
        Math.max(dimensions.width, dimensions.height, dimensions.depth)
      const firstText = `0 ${unit}`
      const firstContext = labels[0].getContext('2d')
      firstContext.clearRect(0, 0, labels[0].width, labels[0].height)
      firstContext.fillText(firstText, labels[0].width * 0.5, labels[0].height * 0.5)
      elements.gridX.children[0].material.map.needsUpdate = true
      const lastIndex = labels.length - 1
      const last = Math.round(gridInterval * lastIndex * 10) / 100
      const lastText = `${last} ${unit}`
      const lastContext = labels[lastIndex].getContext('2d')
      lastContext.clearRect(0, 0, labels[lastIndex].width, labels[lastIndex].height)
      lastContext.fillText(
        lastText,
        labels[lastIndex].width * 0.5,
        labels[lastIndex].height * 0.5
      )
      elements.gridX.children[lastIndex].material.map.needsUpdate = true
      for (let i = 1; i < labels.length - 1; ++i) {
        const text = (Math.round(i * 10 * gridInterval) / 100).toString()
        const context = labels[i].getContext('2d')
        context.clearRect(0, 0, labels[i].width, labels[i].height)
        context.fillText(text, labels[i].width * 0.5, labels[i].height * 0.5)
        elements.gridX.children[i].material.map.needsUpdate = true
      }
    },
    addGrids (gridSize, numSteps) {
      const gridInterval =
        Math.max(this.dimensions.width, this.dimensions.height, this.dimensions.depth)
      this.createLabels(gridInterval, numSteps, this.unit)
      this.createGrids(gridSize, gridInterval, numSteps)
      addTextToGrid(this.elements.gridX,
        this.elements.gridZ,
        gridSize, numSteps,
        this.labels)
      return gridSize
    },
    createGrids (gridSize, gridInterval, numSteps) {
      this.elements.gridX = new THREE.GridHelper(gridSize, numSteps)
      this.elements.gridY = new THREE.GridHelper(gridSize, numSteps)
      this.elements.gridX.position.y = gridSize * -0.5
      this.elements.gridY.rotateX(Math.PI / 2)
      this.elements.gridY.position.z = gridSize * -0.5
      this.elements.gridZ = new THREE.GridHelper(gridSize, numSteps)
      this.elements.gridZ.rotateZ(Math.PI / 2)
      this.elements.gridZ.position.x = gridSize * -0.5
      this.scene.add(this.elements.gridX)
      this.scene.add(this.elements.gridY)
      this.scene.add(this.elements.gridZ)
    },
    loadAnimation () {
      this.model.rotateZ(-0.05)
      this.renderer.render(this.scene, this.camera)
      if (!this.loaded) {
        this.currentFrame = requestAnimationFrame(this.loadAnimation)
      } else if (this.glSupported) {
        this.currentFrame = requestAnimationFrame(this.animate)
      } else {
        cancelAnimationFrame(this.currentFrame)
      }
    },
    animate () {
      let dimensions = {
        width: 0,
        height: 0,
        depth: 0
      }
      this.elements.group.quaternion.set(0, 0, 0, 1)
      this.eulerRotation.set(
        THREE._Math.degToRad(this.rotation.x),
        THREE._Math.degToRad(this.rotation.y),
        THREE._Math.degToRad(this.rotation.z)
      )
      this.elements.shadowModel.setRotationFromEuler(this.eulerRotation)
      this.elements.shadowBox.update()
      collectModelData(this.elements.shadowBox, this.size, this.offset)
      if (!this.dimensions ||
        !this.dimensions.width ||
        !this.dimensions.height ||
        !this.dimensions.depth) {
        dimensions.width = this.size.x
        dimensions.height = this.size.y
        dimensions.depth = this.size.z
      } else {
        dimensions.width = this.dimensions.width
        dimensions.height = this.dimensions.height
        dimensions.depth = this.dimensions.depth
      }
      setModelAttributes(this.size, this.offset,
        this.position, this.scale, dimensions, this.rotation)
      this.model.setRotationFromEuler(this.eulerRotation)
      this.elements.group.scale.set(
        this.scale.x,
        this.scale.y,
        this.scale.z
      )
      this.elements.group.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      )
      this.elements.box.update()
      this.updateLabels(this.elements, this.labels, NUM_STEPS, dimensions,
        this.unit)
      if (this.scale.x && this.scale.y && this.scale.z) {
        this.renderer.render(this.scene, this.camera)
      }
      if (this.emitUpdate) {
        this.$emit('updated', {
          width: this.size.x,
          height: this.size.y,
          depth: this.size.z
        })
        this.emitUpdate = false
      }
      this.currentFrame = requestAnimationFrame(this.animate)
    },
    collectMeshes (obj3D) {
      if (obj3D.constructor === THREE.Mesh) {
        this.meshes.push(obj3D)
      }
    },
    resize () {
      if (!this.supported) return
      let height = this.$refs.size.clientHeight
      let width = this.$refs.size.clientWidth
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.orbit.update()
      this.renderer.setSize(width, height)
    }
  },
  supportedFormats () {
    return loaders.availableLoaders()
  }
}

function makeHalfCircle () {
  let geometry = new THREE.RingBufferGeometry(4.5, 5, 32, 1, 0, Math.PI / 3)
  let material = new THREE.MeshBasicMaterial({ color: 0x000000 })
  let circle = new THREE.Mesh(geometry, material)
  return circle
}

function setModelAttributes (size, offset, position, scale, target) {
  const max = Math.max(target.width, target.height, target.depth)
  scale.x = (target.width / max) / size.x
  scale.y = (target.height / max) / size.y
  scale.z = (target.depth / max) / size.z
  const base = calculateBase(max, target, scale, size, 100)
  scale.x = scale.x * base
  scale.y = scale.y * base
  scale.z = scale.z * base
  position.x = -50 + (scale.x * (-offset.x + (size.x * 0.5)))
  position.y = -50 + (scale.y * (-offset.y + (size.y * 0.5)))
  position.z = -50 + (scale.z * (-offset.z + (size.z * 0.5)))
}

function calculateBase (max, target, scale, size, maxSize) {
  if (max === target.width) return maxSize / (scale.x * size.x)
  else if (max === target.height) return maxSize / (scale.y * size.y)
  return maxSize / (scale.z * size.z)
}

function collectModelData (model, size, offset) {
  model.geometry.computeBoundingBox()
  const box = model.geometry.boundingBox
  box.getSize(size)
  box.getCenter(offset)
}

</script>

<style>
.webgl-canvas {
  width: 100%;
  height: 100%;
}
.webgl-renderer {
  height: 300px;
  width: 300px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column
}
.renderer-frame {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: center;
}
</style>
