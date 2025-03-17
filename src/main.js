import * as THREE from 'three';

// Passo 1: Criar a Cena, a Câmara e o Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Fundo preto (podes alterar)

const camera = new THREE.PerspectiveCamera(
  75, // campo de visão
  window.innerWidth / window.innerHeight, // proporção
  0.1, // plano de recorte próximo
  1000 // plano de recorte distante
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Passo 2: Adicionar Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(2, 2, 5);
scene.add(directionalLight);

// Passo 3: Adicionar um Objeto para Teste (Cubo)
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Passo 4: Função de Animação
function animate() {
  requestAnimationFrame(animate);

  // Rotação do cubo para teste
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();

// Passo 5: Ajustar a cena quando o ecrã for redimensionado
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
