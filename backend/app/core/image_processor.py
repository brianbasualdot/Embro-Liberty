import cv2
import numpy as np
from typing import List, Dict, Any

def process_image_kmeans(image_bytes: bytes, k: int = 5) -> Dict[str, Any]:
    """
    Process an image using K-Means clustering to segment colors and extract vector paths.
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Could not decode image")

    # Convert to LAB color space for better perceptual color segmentation
    image_lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    
    # Reshape the image to a 2D array of pixels
    pixel_values = image_lab.reshape((-1, 3))
    pixel_values = np.float32(pixel_values)

    # Define stopping criteria for K-Means
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)
    
    # Perform K-Means clustering
    _, labels, centers = cv2.kmeans(pixel_values, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    # Convert centers back to uint8
    centers = np.uint8(centers)
    
    # Create the segmented image
    segmented_data = centers[labels.flatten()]
    segmented_image = segmented_data.reshape(image_lab.shape)
    
    # Convert segmented image back to BGR for contour detection setup (logic operates on masks)
    # Actually we can just work with the labels to create masks for each cluster
    
    labels_reshaped = labels.reshape((image.shape[0], image.shape[1]))
    
    paths = []
    
    for i in range(k):
        # Create a binary mask for the current cluster
        mask = np.uint8(labels_reshaped == i) * 255
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Get the color of this cluster (convert LAB to RGB for frontend)
        lab_color = np.array([[centers[i]]], dtype=np.uint8)
        rgb_color = cv2.cvtColor(lab_color, cv2.COLOR_LAB2RGB)[0][0]
        hex_color = "#{:02x}{:02x}{:02x}".format(rgb_color[0], rgb_color[1], rgb_color[2])
        
        cluster_paths = []
        for contour in contours:
            # Simplify contour (epsilon can be adjusted for fidelity vs path complexity)
            epsilon = 0.001 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Identify single points or invalid geometries
            if len(approx) < 3:
                continue
                
            points = approx.reshape(-1, 2).tolist()
            cluster_paths.append(points)
            
        if cluster_paths:
            paths.append({
                "color": hex_color,
                "paths": cluster_paths
            })
            
    return {
        "k": k,
        "layers": paths,
        "original_size": {"width": image.shape[1], "height": image.shape[0]}
    }
