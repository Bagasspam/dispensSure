import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Import tekstur gambar awan
import cloudTextureImage from '../assets/cloud.png'; // SESUAIKAN PATH DAN NAMA FILE GAMBAR AWAN ANDA!

const WaterBackground = () => {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- SETUP AWAN ---
        const cloudGroup = new THREE.Group();
        scene.add(cloudGroup);

        const textureLoader = new THREE.TextureLoader();
        let cloudMap = null;

        cloudMap = textureLoader.load(cloudTextureImage,
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(4, 4);
                console.log("Cloud texture loaded successfully.");
                cloudGroup.children.forEach(cloud => {
                    if (cloud.material) {
                        cloud.material.map = texture;
                        cloud.material.alphaMap = texture;
                        cloud.material.needsUpdate = true;
                        cloud.material.color.set(0xffffff);
                        cloud.material.opacity = 1.0;
                    }
                });
            },
            undefined,
            (err) => {
                console.error('Error loading cloud texture:', err);
                cloudMap = null;
            }
        );

        const numberOfClouds = 25; // MENAMBAH JUMLAH AWAN (dari 15 ke 25)
        for (let i = 0; i < numberOfClouds; i++) {
            const cloudGeometry = new THREE.PlaneGeometry(20, 10);

            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: 0xcccccc,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });

            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

            // Posisikan awan secara acak di area langit
            cloud.position.x = (Math.random() - 0.5) * 100; // RENTANG X LEBIH LUAS (dari 80 ke 100)
            cloud.position.y = Math.random() * 40 + 10;    // RENTANG Y LEBIH LUAS (dari 10 hingga 50)
            cloud.position.z = (Math.random() - 0.5) * 80 - 50; // RENTANG Z LEBIH LUAS DAN LEBIH JAUH KE BELAKANG (-90 hingga -10)

            cloud.rotation.y = Math.random() * Math.PI * 2;
            cloud.rotation.z = Math.random() * 0.2 - 0.1;

            cloudGroup.add(cloud);
        }

        // --- PENGATURAN KAMERA ---
        camera.position.set(0, 15, 40); // KAMERA SEDIKIT LEBIH TINGGI (Y=15) DAN LEBIH MUNDUR (Z=40)
        camera.lookAt(new THREE.Vector3(0, 10, 0)); // Fokus ke tengah ketinggian awan

        // Fungsi Animasi Utama
        let animationFrameId;
        let lastTime = 0;
        const animate = (currentTime) => {
            animationFrameId = requestAnimationFrame(animate);

            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Gerakkan awan lebih cepat
            cloudGroup.position.x += deltaTime * 5; // KECEPATAN AWAN LEBIH TINGGI (dari 2 ke 5)
            cloudGroup.position.z += deltaTime * 0.2; // Gerakkan sedikit di sumbu Z untuk ilusi kedalaman

            // Jika awan sudah terlalu jauh ke kanan, reset posisinya ke kiri
            if (cloudGroup.position.x > 50) { // BATAS RESET X LEBIH LUAS
                cloudGroup.position.x = -50; // Reset ke batas kiri
                cloudGroup.position.y = Math.random() * 40 + 10; // Acak posisi Y saat reset
                cloudGroup.position.z = (Math.random() - 0.5) * 80 - 50; // Acak posisi Z saat reset
            }

            renderer.render(scene, camera);
        };

        animate(0);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);

            if (mountRef.current && renderer) {
                mountRef.current.removeChild(renderer.domElement);
                renderer.dispose();
                scene.traverse((object) => {
                    if (object.isMesh) {
                        object.geometry.dispose();
                        if (object.material.isMaterial) {
                            object.material.dispose();
                        } else if (Array.isArray(object.material)) {
                            object.material.forEach(m => m.dispose());
                        }
                    }
                });
                scene.clear();
            }
        };
    }, []);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}></div>;
};

export default WaterBackground;