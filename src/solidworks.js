import * as THREE from 'three-full'
import request from 'request-promise-native'

export default async function solidworksLoader (src) {
  const res = await request.post({
    json: true,
    uri: 'https://loader.makernet.org',
    body: {
      url: src,
    }
  })
  const vertices = new Float32Array(res.vertices)
  const normals = new Float32Array(res.normals)
  console.log(res)
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3))
  const material = new THREE.MeshNormalMaterial()
  let mesh = new THREE.Mesh(geometry, material)
  return mesh
}
