// ... previous lines of code
        when(imageService.uploadImage(any(), eq("student1"), any(Integer.class), any(Integer.class))).thenReturn(metadata); // Updated mock setup
        // ... following lines of code